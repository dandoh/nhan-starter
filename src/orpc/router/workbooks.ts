import { os, ORPCError } from '@orpc/server'
import * as z from 'zod'
import { authMiddleware } from '../middleware/auth'
import { db } from '@/db'
import { workbooks, workbookBlocks, aiMarkdowns, aiTables } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import type { BlockOrder } from '@/db/schema'
import { chain, isEqual } from 'lodash-es'

// ============================================================================
// Workbook Management
// ============================================================================

/**
 * List all workbooks for the authenticated user
 */
export const listWorkbooks = os
  .use(authMiddleware)
  .handler(async ({ context }) => {
    const userWorkbooks = await db.query.workbooks.findMany({
      where: eq(workbooks.userId, context.user.id),
      orderBy: [desc(workbooks.updatedAt)],
    })

    return userWorkbooks
  })

/**
 * Create a new workbook
 */
export const createWorkbook = os
  .use(authMiddleware)
  .input(
    z.object({
      name: z.string().min(1).max(255),
      description: z.string().optional(),
    }),
  )
  .handler(async ({ input, context }) => {
    const [newWorkbook] = await db
      .insert(workbooks)
      .values({
        userId: context.user.id,
        name: input.name,
        description: input.description,
      })
      .returning()

    return newWorkbook
  })

/**
 * Get workbook details
 */
export const getWorkbook = os
  .use(authMiddleware)
  .input(
    z.object({
      workbookId: z.string().uuid(),
    }),
  )
  .handler(async ({ input, context }) => {
    const workbook = await db.query.workbooks.findFirst({
      where: and(
        eq(workbooks.id, input.workbookId),
        eq(workbooks.userId, context.user.id),
      ),
    })

    // Normalize order

    if (!workbook) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Workbook not found',
      })
    }

    return workbook
  })

/**
 * Update workbook name and description
 */
export const updateWorkbook = os
  .use(authMiddleware)
  .input(
    z.object({
      workbookId: z.string().uuid(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional().nullable(),
      blockOrder: z.record(z.string().uuid(), z.number()).optional(),
    }),
  )
  .handler(async ({ input, context }) => {
    // Verify ownership
    const workbook = await db.query.workbooks.findFirst({
      where: and(
        eq(workbooks.id, input.workbookId),
        eq(workbooks.userId, context.user.id),
      ),
    })

    if (!workbook) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Workbook not found',
      })
    }

    const [updated] = await db
      .update(workbooks)
      .set({
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
        ...(input.blockOrder !== undefined && { blockOrder: input.blockOrder }),
      })
      .where(eq(workbooks.id, input.workbookId))
      .returning()

    return updated
  })

/**
 * Delete a workbook
 */
export const deleteWorkbook = os
  .use(authMiddleware)
  .input(
    z.object({
      workbookId: z.string().uuid(),
    }),
  )
  .handler(async ({ input, context }) => {
    // Verify ownership and delete
    const result = await db
      .delete(workbooks)
      .where(
        and(
          eq(workbooks.id, input.workbookId),
          eq(workbooks.userId, context.user.id),
        ),
      )
      .returning()

    if (result.length === 0) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Workbook not found',
      })
    }

    return { success: true }
  })

// ============================================================================
// Workbook Blocks Management
// ============================================================================

/**
 * Get all blocks for a workbook
 */
export const getBlocks = os
  .use(authMiddleware)
  .input(
    z.object({
      workbookId: z.string().uuid(),
    }),
  )
  .handler(async ({ input, context }) => {
    // Verify workbook ownership
    const workbook = await db.query.workbooks.findFirst({
      where: and(
        eq(workbooks.id, input.workbookId),
        eq(workbooks.userId, context.user.id),
      ),
    })

    if (!workbook) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Workbook not found',
      })
    }

    // Get all blocks for this workbook
    const blocks = await db.query.workbookBlocks.findMany({
      where: eq(workbookBlocks.workbookId, input.workbookId),
    })

    return blocks
  })

/**
 * Get a single markdown by ID
 */
export const getMarkdown = os
  .use(authMiddleware)
  .input(
    z.object({
      markdownId: z.string().uuid(),
    }),
  )
  .handler(async ({ input, context }) => {
    const markdown = await db.query.aiMarkdowns.findFirst({
      where: and(
        eq(aiMarkdowns.id, input.markdownId),
        eq(aiMarkdowns.userId, context.user.id),
      ),
    })

    if (!markdown) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Markdown not found',
      })
    }

    return markdown
  })

/**
 * Update markdown content
 */
export const updateMarkdown = os
  .use(authMiddleware)
  .input(
    z.object({
      markdownId: z.string().uuid(),
      content: z.string(),
    }),
  )
  .handler(async ({ input, context }) => {
    // Verify ownership through workbook block
    const markdown = await db.query.aiMarkdowns.findFirst({
      where: and(
        eq(aiMarkdowns.id, input.markdownId),
        eq(aiMarkdowns.userId, context.user.id),
      ),
    })

    if (!markdown) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Markdown not found',
      })
    }

    const [updated] = await db
      .update(aiMarkdowns)
      .set({ content: input.content })
      .where(eq(aiMarkdowns.id, input.markdownId))
      .returning()

    return updated
  })

/**
 * Create a new block in a workbook
 */
export const createBlock = os
  .use(authMiddleware)
  .input(
    z.object({
      id: z.string().uuid().optional(),
      workbookId: z.string().uuid(),
      type: z.enum(['markdown', 'table']),
      // For markdown blocks
      initialMarkdown: z.string().optional(),
      // For table blocks
      tableName: z.string().optional(),
    }),
  )
  .handler(async ({ input, context }) => {
    // Verify workbook ownership
    const workbook = await db.query.workbooks.findFirst({
      where: and(
        eq(workbooks.id, input.workbookId),
        eq(workbooks.userId, context.user.id),
      ),
    })

    if (!workbook) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Workbook not found',
      })
    }

    // Create the underlying content based on type
    let aiMarkdownId: string | null = null
    let aiTableId: string | null = null

    if (input.type === 'markdown') {
      // Create markdown content
      const [markdown] = await db
        .insert(aiMarkdowns)
        .values({
          userId: context.user.id,
          content: input.initialMarkdown || '',
        })
        .returning()

      aiMarkdownId = markdown.id
    } else {
      // Create AI table
      const [table] = await db
        .insert(aiTables)
        .values({
          userId: context.user.id,
          name: input.tableName || 'Untitled Table',
        })
        .returning()

      aiTableId = table.id
    }

    // Create the workbook block
    const [block] = await db
      .insert(workbookBlocks)
      .values({
        ...(input.id && { id: input.id }),
        workbookId: input.workbookId,
        type: input.type,
        aiMarkdownId,
        aiTableId,
      })
      .returning()

    return block
  })

/**
 * Delete a block from a workbook
 */
export const deleteBlock = os
  .use(authMiddleware)
  .input(
    z.object({
      blockId: z.string().uuid(),
    }),
  )
  .handler(async ({ input, context }) => {
    // Find the block and verify ownership through workbook
    const block = await db.query.workbookBlocks.findFirst({
      where: eq(workbookBlocks.id, input.blockId),
      with: {
        workbook: true,
      },
    })

    if (!block) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Block not found',
      })
    }

    if (block.workbook.userId !== context.user.id) {
      throw new ORPCError('FORBIDDEN', {
        message: 'You do not have permission to delete this block',
      })
    }

    // Remove block from workbook's blockOrder
    const currentOrder = (block.workbook.blockOrder as BlockOrder | null) ?? {}
    const { [block.id]: _, ...newOrder } = currentOrder

    await db
      .update(workbooks)
      .set({ blockOrder: newOrder })
      .where(eq(workbooks.id, block.workbookId))

    // Delete the block (cascade will delete aiMarkdown or aiTable)
    await db.delete(workbookBlocks).where(eq(workbookBlocks.id, input.blockId))

    return { success: true }
  })
