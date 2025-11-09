import { os } from '@orpc/server'
import * as z from 'zod'
import { authMiddleware } from '../middleware/auth'
import { db } from '@/db'
import {
  workbooks,
  workbookBlocks,
  aiTables,
  aiTableColumns,
  WORKBOOK_BLOCK_TYPES,
} from '@/db/schema'
import { and, eq } from 'drizzle-orm'

// ============================================================================
// Workbook Management
// ============================================================================

/**
 * List all workbooks for the authenticated user
 */
export const listWorkbooks = os
  .use(authMiddleware)
  .input(z.object({}))
  .handler(async ({ context }) => {
    const allWorkbooks = await db.query.workbooks.findMany({
      where: eq(workbooks.userId, context.user.id),
      orderBy: (w, { desc }) => [desc(w.createdAt)],
    })

    return allWorkbooks
  })

/**
 * Create a new workbook
 */
export const createWorkbook = os
  .use(authMiddleware)
  .input(
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      status: z.enum(['exploratory', 'in_progress', 'ready']).optional(),
    }),
  )
  .handler(async ({ input, context }) => {
    const [newWorkbook] = await db
      .insert(workbooks)
      .values({
        ...(input.id && { id: input.id }),
        userId: context.user.id,
        name: input.name,
        description: input.description || '',
        status: input.status || 'exploratory',
        blockOrder: [],
      })
      .returning()

    return newWorkbook
  })

/**
 * Get workbook details with blocks and referenced table data
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
      with: {
        blocks: {
          orderBy: (blocks, { asc }) => [asc(blocks.createdAt)],
          with: {
            table: true, // Include table data for table blocks
          },
        },
      },
    })

    if (!workbook) {
      throw new Error('Workbook not found')
    }

    return workbook
  })

/**
 * Update workbook metadata (name, description, status, blockOrder)
 */
export const updateWorkbook = os
  .use(authMiddleware)
  .input(
    z.object({
      workbookId: z.string().uuid(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional().nullable(),
      status: z.enum(['exploratory', 'in_progress', 'ready']).optional(),
      blockOrder: z.array(z.string().uuid()).optional().nullable(),
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
      throw new Error('Workbook not found')
    }

    const updatedFields = {
      ...(input.name && { name: input.name }),
      ...(input.description !== undefined && {
        description: input.description,
      }),
      ...(input.status && { status: input.status }),
      ...(input.blockOrder && {
        blockOrder: input.blockOrder,
      }),
    }

    if (Object.keys(updatedFields).length === 0) {
      return workbook
    }

    const [updated] = await db
      .update(workbooks)
      .set(updatedFields)
      .where(eq(workbooks.id, input.workbookId))
      .returning()

    if (!updated) {
      throw new Error('Failed to update workbook')
    }

    return updated
  })

/**
 * Delete a workbook and all its blocks
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
      throw new Error('Workbook not found')
    }

    return { success: true }
  })

// ============================================================================
// Block Operations
// ============================================================================

/**
 * Create a new block in a workbook
 * For table blocks, creates a new table automatically
 */
export const createBlock = os
  .use(authMiddleware)
  .input(
    z.object({
      workbookId: z.string().uuid(),
      blockType: z.enum(WORKBOOK_BLOCK_TYPES),
      id: z.string().uuid().optional(), // Optional client-generated ID
      tableName: z.string().min(1).max(255).optional(), // Optional name for table blocks
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
      throw new Error('Workbook not found')
    }

    const result = await db.transaction(async (tx) => {
      let createdTable: (typeof aiTables.$inferSelect) | null = null

      // For table blocks, create a new table
      if (input.blockType === 'table') {
        const tableName = input.tableName || 'New Table'
        
        // Create table
        const [newTable] = await tx
          .insert(aiTables)
          .values({
            userId: context.user.id,
            name: tableName,
          })
          .returning()

        // Create default "Subject" column
        await tx.insert(aiTableColumns).values({
          name: 'Subject',
          tableId: newTable.id,
          aiPrompt: '',
          outputTypeConfig: null,
          primary: true,
        })

        createdTable = newTable
      }

      // Create block
      const [newBlock] = await tx
        .insert(workbookBlocks)
        .values({
          ...(input.id && { id: input.id }),
          workbookId: input.workbookId,
          blockType: input.blockType,
          tableId: createdTable?.id || null,
        })
        .returning()

      // Update blockOrder to include the new block
      const currentBlockOrder = workbook.blockOrder || []
      const updatedBlockOrder = [...currentBlockOrder, newBlock.id]

      await tx
        .update(workbooks)
        .set({ blockOrder: updatedBlockOrder })
        .where(eq(workbooks.id, input.workbookId))

      return {
        block: newBlock,
        table: createdTable,
      }
    })

    return result
  })

/**
 * Update a block (change tableId)
 */
export const updateBlock = os
  .use(authMiddleware)
  .input(
    z.object({
      blockId: z.string().uuid(),
      tableId: z.string().uuid().optional(),
    }),
  )
  .handler(async ({ input, context }) => {
    // Verify ownership through workbook
    const block = await db.query.workbookBlocks.findFirst({
      where: eq(workbookBlocks.id, input.blockId),
      with: {
        workbook: true,
      },
    })

    if (!block || block.workbook.userId !== context.user.id) {
      throw new Error('Block not found')
    }

    // If updating tableId, verify table exists and is owned by user
    if (input.tableId) {
      const table = await db.query.aiTables.findFirst({
        where: and(
          eq(aiTables.id, input.tableId),
          eq(aiTables.userId, context.user.id),
        ),
      })

      if (!table) {
        throw new Error('Table not found or access denied')
      }
    }

    const updatedFields = {
      ...(input.tableId && { tableId: input.tableId }),
    }

    if (Object.keys(updatedFields).length === 0) {
      return block
    }

    const [updated] = await db
      .update(workbookBlocks)
      .set(updatedFields)
      .where(eq(workbookBlocks.id, input.blockId))
      .returning()

    if (!updated) {
      throw new Error('Failed to update block')
    }

    return updated
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
    // Verify ownership through workbook
    const block = await db.query.workbookBlocks.findFirst({
      where: eq(workbookBlocks.id, input.blockId),
      with: {
        workbook: true,
      },
    })

    if (!block || block.workbook.userId !== context.user.id) {
      throw new Error('Block not found')
    }

    await db.transaction(async (tx) => {
      // Delete the block
      await tx.delete(workbookBlocks).where(eq(workbookBlocks.id, input.blockId))

      // Remove block ID from workbook's blockOrder
      const currentBlockOrder = block.workbook.blockOrder || []
      const updatedBlockOrder = currentBlockOrder.filter(
        (id) => id !== input.blockId,
      )

      await tx
        .update(workbooks)
        .set({ blockOrder: updatedBlockOrder })
        .where(eq(workbooks.id, block.workbookId))
    })

    return { success: true }
  })

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
      throw new Error('Workbook not found')
    }

    const blocks = await db.query.workbookBlocks.findMany({
      where: eq(workbookBlocks.workbookId, input.workbookId),
      orderBy: (b, { asc }) => [asc(b.createdAt)],
    })

    return blocks
  })

