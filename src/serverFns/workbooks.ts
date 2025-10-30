import { createServerFn } from '@tanstack/react-start'
import * as z from 'zod'
import { authMiddleware } from '@/serverFns/middleware/auth-middleware'
import { defineFunction } from '@/serverFns/utils'
import { db } from '@/db'
import { workbooks, workbookBlocks, aiMarkdowns, aiTables } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import type { BlockOrder } from '@/db/schema'

// ============================================================================
// Workbook Management
// ============================================================================
/**
 * List all workbooks for the authenticated user
 */
const listWorkbooksDef = defineFunction({
  handler: async ({ context }) => {
    const userWorkbooks = await db.query.workbooks.findMany({
      where: eq(workbooks.userId, context.user.id),
      orderBy: [desc(workbooks.updatedAt)],
    })

    return userWorkbooks
  },
})

export const serverFnListWorkbooks = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(listWorkbooksDef.handler)

/**
 * Create a new workbook
 */
const createWorkbookDef = defineFunction({
  input: z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
  }),
  handler: async ({ data: input, context }) => {
    const [newWorkbook] = await db
      .insert(workbooks)
      .values({
        userId: context.user.id,
        name: input.name,
        description: input.description,
      })
      .returning()

    return newWorkbook
  },
})

export const serverFnCreateWorkbook = createServerFn({ method: 'POST' })
  .inputValidator(createWorkbookDef.input)
  .middleware([authMiddleware])
  .handler(createWorkbookDef.handler)

/**
 * Get workbook details
 */
const getWorkbookDef = defineFunction({
  input: z.object({
    workbookId: z.string().uuid(),
  }),
  handler: async ({ data: input, context }) => {
    const workbook = await db.query.workbooks.findFirst({
      where: and(
        eq(workbooks.id, input.workbookId),
        eq(workbooks.userId, context.user.id),
      ),
    })

    // Normalize order

    if (!workbook) {
      throw new Error('Workbook not found')
    }

    return workbook
  },
})

export const serverFnGetWorkbook = createServerFn({ method: 'GET' })
  .inputValidator(getWorkbookDef.input)
  .middleware([authMiddleware])
  .handler(getWorkbookDef.handler)

/**
 * Update workbook name and description
 */
const updateWorkbookDef = defineFunction({
  input: z.object({
    workbookId: z.string().uuid(),
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional().nullable(),
    blockOrder: z.record(z.string().uuid(), z.number()).optional(),
  }),
  handler: async ({ data: input, context }) => {
    // Verify ownership
    const workbook = await db.query.workbooks.findFirst({
      where: and(
        eq(workbooks.id, input.workbookId),
        eq(workbooks.userId, context.user.id),
      ),
    })

    if (!workbook) {
      throw new Error('Workbook not found')
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
  },
})

export const serverFnUpdateWorkbook = createServerFn({ method: 'POST' })
  .inputValidator(updateWorkbookDef.input)
  .middleware([authMiddleware])
  .handler(updateWorkbookDef.handler)

/**
 * Delete a workbook
 */
const deleteWorkbookDef = defineFunction({
  input: z.object({
    workbookId: z.string().uuid(),
  }),
  handler: async ({ data: input, context }) => {
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
      throw new Error('Workbook not found')
    }

    return { success: true }
  },
})

export const serverFnDeleteWorkbook = createServerFn({ method: 'POST' })
  .inputValidator(deleteWorkbookDef.input)
  .middleware([authMiddleware])
  .handler(deleteWorkbookDef.handler)

// ============================================================================
// Workbook Blocks Management
// ============================================================================

/**
 * Get all blocks for a workbook
 */
const getBlocksDef = defineFunction({
  input: z.object({
    workbookId: z.string().uuid(),
  }),
  handler: async ({ data: input, context }) => {
    // Verify workbook ownership
    const workbook = await db.query.workbooks.findFirst({
      where: and(
        eq(workbooks.id, input.workbookId),
        eq(workbooks.userId, context.user.id),
      ),
    })

    if (!workbook) {
      throw new Error('Workbook not found')
    }

    // Get all blocks for this workbook
    const blocks = await db.query.workbookBlocks.findMany({
      where: eq(workbookBlocks.workbookId, input.workbookId),
    })

    return blocks
  },
})

export const serverFnGetBlocks = createServerFn({ method: 'GET' })
  .inputValidator(getBlocksDef.input)
  .middleware([authMiddleware])
  .handler(getBlocksDef.handler)

/**
 * Get a single markdown by ID
 */
const getMarkdownDef = defineFunction({
  input: z.object({
    markdownId: z.string().uuid(),
  }),
  handler: async ({ data: input, context }) => {
    const markdown = await db.query.aiMarkdowns.findFirst({
      where: and(
        eq(aiMarkdowns.id, input.markdownId),
        eq(aiMarkdowns.userId, context.user.id),
      ),
    })

    if (!markdown) {
      throw new Error('Markdown not found')
    }

    return markdown
  },
})

export const serverFnGetMarkdown = createServerFn({ method: 'GET' })
  .inputValidator(getMarkdownDef.input)
  .middleware([authMiddleware])
  .handler(getMarkdownDef.handler)

/**
 * Update markdown content
 */
const updateMarkdownDef = defineFunction({
  input: z.object({
    markdownId: z.string().uuid(),
    content: z.string(),
  }),
  handler: async ({ data: input, context }) => {
    // Verify ownership through workbook block
    const markdown = await db.query.aiMarkdowns.findFirst({
      where: and(
        eq(aiMarkdowns.id, input.markdownId),
        eq(aiMarkdowns.userId, context.user.id),
      ),
    })

    if (!markdown) {
      throw new Error('Markdown not found')
    }

    const [updated] = await db
      .update(aiMarkdowns)
      .set({ content: input.content })
      .where(eq(aiMarkdowns.id, input.markdownId))
      .returning()

    return updated
  },
})

export const serverFnUpdateMarkdown = createServerFn({ method: 'POST' })
  .inputValidator(updateMarkdownDef.input)
  .middleware([authMiddleware])
  .handler(updateMarkdownDef.handler)

/**
 * Create a new block in a workbook
 */
const createBlockDef = defineFunction({
  input: z.object({
    id: z.string().uuid().optional(),
    workbookId: z.string().uuid(),
    type: z.enum(['markdown', 'table']),
    // For markdown blocks
    initialMarkdown: z.string().optional(),
    // For table blocks
    tableName: z.string().optional(),
  }),
  handler: async ({ data: input, context }) => {
    // Verify workbook ownership
    const workbook = await db.query.workbooks.findFirst({
      where: and(
        eq(workbooks.id, input.workbookId),
        eq(workbooks.userId, context.user.id),
      ),
    })

    if (!workbook) {
      throw new Error('Workbook not found')
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
  },
})

export const serverFnCreateBlock = createServerFn({ method: 'POST' })
  .inputValidator(createBlockDef.input)
  .middleware([authMiddleware])
  .handler(createBlockDef.handler)

/**
 * Delete a block from a workbook
 */
const deleteBlockDef = defineFunction({
  input: z.object({
    blockId: z.string().uuid(),
  }),
  handler: async ({ data: input, context }) => {
    // Find the block and verify ownership through workbook
    const block = await db.query.workbookBlocks.findFirst({
      where: eq(workbookBlocks.id, input.blockId),
      with: {
        workbook: true,
      },
    })

    if (!block) {
      throw new Error('Block not found')
    }

    if (block.workbook.userId !== context.user.id) {
      throw new Error('You do not have permission to delete this block')
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
  },
})

export const serverFnDeleteBlock = createServerFn({ method: 'POST' })
  .inputValidator(deleteBlockDef.input)
  .middleware([authMiddleware])
  .handler(deleteBlockDef.handler)
