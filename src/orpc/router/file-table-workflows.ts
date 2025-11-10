import { os } from '@orpc/server'
import * as z from 'zod'
import { authMiddleware } from '../middleware/auth'
import { db } from '@/db'
import {
  fileTableWorkflows,
  FileTableWorkflowFile,
  FileTableWorkflowColumn,
  aiTables,
  aiTableColumns,
} from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID, createHash } from 'node:crypto'
import { env } from '@/env'
import { ensureBucketExists } from '@/lib/s3-client'
import { inngest } from '@/inngest/client'

// ============================================================================
// File Table Workflow Management
// ============================================================================

/**
 * Create a new file table workflow
 */
export const createFileTableWorkflow = os
  .use(authMiddleware)
  .input(
    z.object({
      id: z.string().uuid().optional(),
    }),
  )
  .handler(async ({ input, context }) => {
    const [newWorkflow] = await db
      .insert(fileTableWorkflows)
      .values({
        ...(input.id && { id: input.id }),
        userId: context.user.id,
        files: [],
        suggestedColumns: [
          {
            name: 'File',
            outputType: 'file',
            autoPopulate: false,
            primary: true,
          },
        ],
      })
      .returning()

    return newWorkflow
  })

/**
 * List all file table workflows for the authenticated user
 */
export const listFileTableWorkflows = os
  .use(authMiddleware)
  .input(z.object({}))
  .handler(async ({ context }) => {
    const workflows = await db.query.fileTableWorkflows.findMany({
      where: eq(fileTableWorkflows.userId, context.user.id),
      orderBy: (w, { desc }) => [desc(w.createdAt)],
    })

    return workflows
  })

/**
 * Get a file table workflow by ID
 */
export const getFileTableWorkflow = os
  .use(authMiddleware)
  .input(
    z.object({
      fileTableWorkflowId: z.string().uuid(),
    }),
  )
  .handler(async ({ input, context }) => {
    const workflow = await db.query.fileTableWorkflows.findFirst({
      where: and(
        eq(fileTableWorkflows.id, input.fileTableWorkflowId),
        eq(fileTableWorkflows.userId, context.user.id),
      ),
    })

    if (!workflow) {
      throw new Error('Workflow not found')
    }

    return workflow
  })

/**
 * Update a file table workflow
 */
export const updateFileTableWorkflow = os
  .use(authMiddleware)
  .input(
    z.object({
      fileTableWorkflowId: z.string().uuid(),
      files: z
        .array(
          z.object({
            id: z.string(),
            s3Bucket: z.string(),
            s3Key: z.string(),
            filename: z.string(),
            size: z.number(),
            status: z.string(),
          }),
        )
        .optional(),
      suggestedColumns: z
        .array(
          z.object({
            name: z.string(),
            outputType: z.enum([
              'text',
              'long_text',
              'single_select',
              'multi_select',
              'date',
              'file',
            ]),
            autoPopulate: z.boolean(),
            primary: z.boolean(),
          }),
        )
        .optional(),
    }),
  )
  .handler(async ({ input, context }) => {
    // Verify ownership
    const workflow = await db.query.fileTableWorkflows.findFirst({
      where: and(
        eq(fileTableWorkflows.id, input.fileTableWorkflowId),
        eq(fileTableWorkflows.userId, context.user.id),
      ),
    })

    if (!workflow) {
      throw new Error('Workflow not found')
    }

    const updatedFields: {
      files?: FileTableWorkflowFile[]
      suggestedColumns?: FileTableWorkflowColumn[]
    } = {}

    if (input.files !== undefined) {
      updatedFields.files = input.files
    }
    if (input.suggestedColumns !== undefined) {
      updatedFields.suggestedColumns = input.suggestedColumns
    }

    if (Object.keys(updatedFields).length === 0) {
      return workflow
    }

    const [updated] = await db
      .update(fileTableWorkflows)
      .set(updatedFields)
      .where(eq(fileTableWorkflows.id, input.fileTableWorkflowId))
      .returning()

    if (!updated) {
      throw new Error('Failed to update workflow')
    }

    return updated
  })

/**
 * Upload files for a workflow
 */
export const uploadWorkflowFiles = os
  .use(authMiddleware)
  .input(
    z.object({
      fileTableWorkflowId: z.string().uuid(),
      files: z.array(
        z.object({
          name: z.string(),
          data: z.string(), // Base64 encoded file data
          type: z.string(), // MIME type
        }),
      ),
    }),
  )
  .handler(async ({ input, context }) => {
    // Verify ownership
    const workflow = await db.query.fileTableWorkflows.findFirst({
      where: and(
        eq(fileTableWorkflows.id, input.fileTableWorkflowId),
        eq(fileTableWorkflows.userId, context.user.id),
      ),
    })

    if (!workflow) {
      throw new Error('Workflow not found')
    }

    // Upload files to S3 and create file entries
    const uploadedFiles: FileTableWorkflowFile[] = []

    // Create S3 client
    const endpoint = env.AWS_S3_ENDPOINT
    const region = env.AWS_S3_REGION
    const bucket = env.AWS_S3_BUCKET
    
    const s3Client = new S3Client({
      endpoint,
      region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    })

    // Ensure bucket exists
    await ensureBucketExists(bucket, region)

    for (const fileInput of input.files) {
      // Convert base64 to buffer
      const buffer = Buffer.from(fileInput.data, 'base64')
      const fileId = randomUUID()
      const key = `${randomUUID()}-${fileInput.name}`
      
      // Calculate SHA-256 content hash
      const contentHash = createHash('sha256').update(buffer).digest('hex')
      
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: fileInput.type || 'application/octet-stream',
          Metadata: {
            originalFilename: fileInput.name,
            contentHash,
          },
        }),
      )
      
      uploadedFiles.push({
        id: fileId,
        s3Bucket: bucket,
        s3Key: key,
        filename: fileInput.name,
        size: buffer.length,
        contentHash,
        status: 'Uploaded',
      })
    }

    // Update workflow with new files
    const updatedFiles = [...workflow.files, ...uploadedFiles]
    
    const [updated] = await db
      .update(fileTableWorkflows)
      .set({ files: updatedFiles })
      .where(eq(fileTableWorkflows.id, input.fileTableWorkflowId))
      .returning()

    if (!updated) {
      throw new Error('Failed to update workflow')
    }

    // Dispatch Inngest events for processing each uploaded file
    for (const file of uploadedFiles) {
      await inngest.send({
        name: 'workflow/file-table-workflow-file.process',
        data: {
          workflowId: input.fileTableWorkflowId,
          fileId: file.id,
          filename: file.filename,
          s3Bucket: file.s3Bucket,
          s3Key: file.s3Key,
          contentHash: file.contentHash,
        },
      })
    }

    return updated
  })

/**
 * Complete a file table workflow by creating a table from selected columns
 */
export const completeFileTableWorkflow = os
  .use(authMiddleware)
  .input(
    z.object({
      fileTableWorkflowId: z.string().uuid(),
      tableName: z.string().min(1).max(255),
      selectedColumns: z.array(
        z.object({
          name: z.string(),
          outputType: z.enum([
            'text',
            'long_text',
            'single_select',
            'multi_select',
            'date',
            'file',
          ]),
          autoPopulate: z.boolean(),
          primary: z.boolean(),
        }),
      ),
    }),
  )
  .handler(async ({ input, context }) => {
    // Verify ownership
    const workflow = await db.query.fileTableWorkflows.findFirst({
      where: and(
        eq(fileTableWorkflows.id, input.fileTableWorkflowId),
        eq(fileTableWorkflows.userId, context.user.id),
      ),
    })

    if (!workflow) {
      throw new Error('Workflow not found')
    }

    // Create table and columns in a transaction
    const result = await db.transaction(async (tx) => {
      // Create table
      const [newTable] = await tx
        .insert(aiTables)
        .values({
          userId: context.user.id,
          name: input.tableName,
        })
        .returning()

      // Create columns from selected columns
      const columnInserts = input.selectedColumns.map((col) => ({
        name: col.name,
        tableId: newTable.id,
        description: '',
        outputType: col.outputType,
        aiPrompt: '',
        outputTypeConfig: null,
        primary: col.primary,
      }))

      await tx.insert(aiTableColumns).values(columnInserts)

      return newTable
    })

    return result
  })

