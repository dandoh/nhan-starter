import { inngest } from '../client'
import { db } from '@/db'
import {
  fileTableWorkflows,
  fileArtifacts,
  fileArtifactEmbeddings,
  FileTableWorkflowColumn,
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import {
  analyzePdfFromS3,
  type PdfAnalyzerMetadata,
} from '@/lib/file-table-workflows/analyzers/pdf-analyzer'
import { s3Client, downloadS3Object } from '@/lib/s3-client'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { env } from '@/env'
import OpenAI from 'openai'
import type { DocumentChunk } from '@/lib/file-table-workflows/analyzers/chunking'
import { suggestColumns } from '@/lib/file-table-workflows/column-suggestions'

// Initialize OpenAI client for embeddings
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
})

// Analyzer version for caching
const ANALYZER_VERSION = '1.0.0'
const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSIONS = 1536

type StoredDocumentChunk = Pick<
  DocumentChunk,
  'index' | 'text' | 'tokenEstimate' | 'charRange' | 'byteRange' | 'pageRange'
>

type AnalyzerStepResult =
  | {
      artifactId: string
      metadata: PdfAnalyzerMetadata | null
      artifactPointer: string
      fromCache: true
      embeddingsPresent: boolean
      chunkCount: number | null
    }
  | {
      artifactId: string
      metadata: PdfAnalyzerMetadata
      artifactPointer: string
      fromCache: false
      embeddingsPresent: boolean
      chunkCount: number
    }

/**
 * Process a single uploaded workflow file
 * Analyzes the file and suggests new columns for the table
 * Concurrency limited to 3 files at a time
 */
export const processFileTableWorkflowFile = inngest.createFunction(
  {
    id: 'process-file-table-workflow-file',
    concurrency: {
      limit: 3,
    },
    retries: 1,
    onFailure: async ({ error, event }) => {
      // Handle any failure by updating file status to error
      const { workflowId, fileId } = event.data.event.data

      // Fetch the workflow
      const workflow = await db.query.fileTableWorkflows.findFirst({
        where: eq(fileTableWorkflows.id, workflowId),
      })

      if (workflow) {
        // Update the file status to error
        const updatedFiles = workflow.files.map((file) =>
          file.id === fileId
            ? { ...file, status: `Error: ${error.message}` }
            : file,
        )

        await db
          .update(fileTableWorkflows)
          .set({ files: updatedFiles })
          .where(eq(fileTableWorkflows.id, workflowId))
      }
    },
  },
  { event: 'workflow/file-table-workflow-file.process' },
  async ({ event, step }) => {
    const { workflowId, fileId } = event.data

    // Step 1: Fetch workflow and file details
    const { workflow, file } = await step.run('fetch-workflow', async () => {
      const result = await db.query.fileTableWorkflows.findFirst({
        where: eq(fileTableWorkflows.id, workflowId),
      })

      if (!result) {
        throw new Error(`Workflow ${workflowId} not found`)
      }

      const fileData = result.files.find((f) => f.id === fileId)
      if (!fileData) {
        throw new Error(`File ${fileId} not found in workflow ${workflowId}`)
      }

      return { workflow: result, file: fileData }
    })

    // Step 2: Update file status to analyzing
    await step.run('set-analyzing-status', async () => {
      const updatedFiles = workflow.files.map((f) =>
        f.id === fileId ? { ...f, status: 'Analyzing' } : f,
      )

      await db
        .update(fileTableWorkflows)
        .set({ files: updatedFiles })
        .where(eq(fileTableWorkflows.id, workflowId))
    })

    // Step 3: Check if artifact already exists in cache
    const cachedArtifact = await step.run('check-artifact-cache', async () => {
      if (!file.contentHash) {
        return null
      }

      const artifact = await db.query.fileArtifacts.findFirst({
        where: and(
          eq(fileArtifacts.userId, workflow.userId),
          eq(fileArtifacts.contentHash, file.contentHash),
          eq(fileArtifacts.analyzerVersion, ANALYZER_VERSION),
        ),
      })

      if (!artifact) {
        return null
      }

      const embeddingRecord = await db.query.fileArtifactEmbeddings.findFirst({
        where: eq(fileArtifactEmbeddings.artifactId, artifact.id),
        columns: {
          id: true,
        },
      })

      return {
        artifact,
        embeddingsPresent: Boolean(embeddingRecord),
      }
    })

    // Step 4: Analyze PDF if not cached
    const artifactData = await step.run(
      'analyze-pdf',
      async (): Promise<AnalyzerStepResult> => {
        if (cachedArtifact) {
          console.log(`Using cached artifact for ${file.contentHash}`)
          return {
            artifactId: cachedArtifact.artifact.id,
            metadata: cachedArtifact.artifact
              .analyzerMetadata as PdfAnalyzerMetadata | null,
            artifactPointer: cachedArtifact.artifact.artifactPointer,
            fromCache: true,
            embeddingsPresent: cachedArtifact.embeddingsPresent,
            chunkCount: null,
          }
        }

        // Analyze PDF from S3
        console.log(`Analyzing PDF from S3: ${file.s3Bucket}/${file.s3Key}`)
        const analysisResult = await analyzePdfFromS3({
          bucket: file.s3Bucket,
          key: file.s3Key,
          expectedContentHash: file.contentHash,
        })

        // Store the full analysis result (text + chunks) in S3
        const artifactKey = `artifacts/${analysisResult.metadata.contentHash}-v${ANALYZER_VERSION}.json`
        await s3Client.send(
          new PutObjectCommand({
            Bucket: env.AWS_S3_BUCKET,
            Key: artifactKey,
            Body: Buffer.from(JSON.stringify(analysisResult)),
            ContentType: 'application/json',
          }),
        )

        // Create artifact record
        const [artifact] = await db
          .insert(fileArtifacts)
          .values({
            userId: workflow.userId,
            contentHash: analysisResult.metadata.contentHash,
            analyzerVersion: ANALYZER_VERSION,
            artifactPointer: artifactKey,
            analyzerMetadata: {
              pageCount: analysisResult.metadata.pageCount,
              title: analysisResult.metadata.title,
              author: analysisResult.metadata.author,
              fileSizeBytes: analysisResult.metadata.fileSizeBytes,
            },
          })
          .returning()

        return {
          artifactId: artifact.id,
          metadata: analysisResult.metadata,
          artifactPointer: artifact.artifactPointer,
          fromCache: false,
          embeddingsPresent: false,
          chunkCount: analysisResult.chunks.length,
        }
      },
    )

    let embeddingStats: { chunksGenerated: number } | null = null

    // Step 5: Generate and store embeddings when needed
    if (!artifactData.embeddingsPresent) {
      embeddingStats = await step.run('generate-embeddings', async () => {
        const { buffer } = await downloadS3Object({
          bucket: env.AWS_S3_BUCKET,
          key: artifactData.artifactPointer,
        })

        const parsed = JSON.parse(buffer.toString('utf-8')) as {
          chunks?: StoredDocumentChunk[]
        }

        const chunks = parsed.chunks ?? []

        if (chunks.length === 0) {
          console.warn(
            `No chunks found for artifact ${artifactData.artifactId}; skipping embeddings`,
          )
          return { chunksGenerated: 0 }
        }

        console.log(`Generating embeddings for ${chunks.length} chunks`)

        // Generate embeddings in batches to avoid rate limits
        const BATCH_SIZE = 100
        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
          const batch = chunks.slice(i, i + BATCH_SIZE)

          const embeddingResponse = await openai.embeddings.create({
            model: EMBEDDING_MODEL,
            input: batch.map((chunk) => chunk.text),
            dimensions: EMBEDDING_DIMENSIONS,
          })

          const embeddingRecords = batch.map((chunk, idx) => ({
            artifactId: artifactData.artifactId,
            chunkIndex: chunk.index,
            embedding: embeddingResponse.data[idx].embedding,
            byteStart: chunk.byteRange.start,
            byteEnd: chunk.byteRange.end,
            tokenCount: chunk.tokenEstimate,
            provider: 'openai',
            model: EMBEDDING_MODEL,
            modelVersion: null,
          }))

          await db.insert(fileArtifactEmbeddings).values(embeddingRecords)
        }

        return { chunksGenerated: chunks.length }
      })
    }

    // Step 6: Update file status to suggesting (before generating column suggestions)
    await step.run('set-suggesting-status', async () => {
      const latestWorkflow = await db.query.fileTableWorkflows.findFirst({
        where: eq(fileTableWorkflows.id, workflowId),
      })

      if (latestWorkflow) {
        const updatedFiles = latestWorkflow.files.map((f) =>
          f.id === fileId ? { ...f, status: 'Suggesting columns' } : f,
        )

        await db
          .update(fileTableWorkflows)
          .set({ files: updatedFiles })
          .where(eq(fileTableWorkflows.id, workflowId))
      }
    })

    // Step 7: Generate column suggestions using LLM
    const llmSuggestionResult = await step.run(
      'generate-column-suggestions-llm',
      async () => {
        // Get existing columns from workflow
        const latestWorkflow = await db.query.fileTableWorkflows.findFirst({
          where: eq(fileTableWorkflows.id, workflowId),
        })

        const existingColumns = latestWorkflow?.suggestedColumns.map((col) => ({
          name: col.name,
          outputType: col.outputType,
        }))

        // Generate suggestions using LLM
        const result = await suggestColumns(
          artifactData.artifactId,
          existingColumns,
        )

        return result
      },
    )

    // Step 8: Update workflow with new column suggestions and LLM metadata
    await step.run('add-column-suggestions', async () => {
      // Fetch latest workflow state
      const latestWorkflow = await db.query.fileTableWorkflows.findFirst({
        where: eq(fileTableWorkflows.id, workflowId),
      })

      if (!latestWorkflow) {
        throw new Error(`Workflow ${workflowId} not found`)
      }

      // Merge new suggestions with existing ones (avoid duplicates by name)
      // For existing columns, add extracted values; for new columns, create with extracted values
      const existingColumnsMap = new Map(
        latestWorkflow.suggestedColumns.map((col) => [
          col.name.toLowerCase(),
          col,
        ]),
      )

      const updatedSuggestions = latestWorkflow.suggestedColumns.map((col) => {
        const matchingSuggestion = llmSuggestionResult.suggestions.find(
          (s) => s.name.toLowerCase() === col.name.toLowerCase(),
        )

        if (matchingSuggestion) {
          // Update existing column with extracted value for this file
          return {
            ...col,
            extractedValues: {
              ...(col.extractedValues || {}),
              [fileId]: matchingSuggestion.extractedValue,
            },
          }
        }

        return col
      })

      // Add new suggestions that don't exist yet
      const uniqueNewSuggestions: FileTableWorkflowColumn[] = llmSuggestionResult.suggestions
        .filter(
          (suggestion) =>
            !existingColumnsMap.has(suggestion.name.toLowerCase()),
        )
        .map((suggestion) => ({
          name: suggestion.name,
          outputType: suggestion.outputType,
          autoPopulate: suggestion.autoPopulate,
          primary: suggestion.primary,
          provenance: suggestion.provenance,
          confidence: suggestion.confidence,
          rationale: suggestion.rationale,
          whyUseful: suggestion.whyUseful,
          extractedValues: {
            [fileId]: suggestion.extractedValue,
          },
        }))

      const finalSuggestions = [...updatedSuggestions, ...uniqueNewSuggestions]

      // Update file status to ready
      const updatedFiles = latestWorkflow.files.map((f) =>
        f.id === fileId ? { ...f, status: 'Ready' } : f,
      )

      await db
        .update(fileTableWorkflows)
        .set({
          suggestedColumns: finalSuggestions,
          files: updatedFiles,
        })
        .where(eq(fileTableWorkflows.id, workflowId))
    })

    return {
      success: true,
      workflowId,
      fileId,
      artifactId: artifactData.artifactId,
      fromCache: artifactData.fromCache,
      chunksProcessed: embeddingStats?.chunksGenerated ?? 0,
      suggestionsAdded: llmSuggestionResult.suggestions.length,
    }
  },
)
