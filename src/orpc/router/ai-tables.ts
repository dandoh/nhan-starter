import { implement, os } from '@orpc/server'
import * as z from 'zod'
import { oc } from '@orpc/contract'
import { authMiddleware } from '../middleware/auth'
import { db } from '@/db'
import {
  aiTableCells,
  aiTableColumns,
  aiTableOutputTypeSchema,
  aiTableRecords,
  aiTables,
} from '@/db/schema'
import { inngest } from '@/inngest/client'
import { validateOutputTypeConfig } from '@/lib/ai-table/output-type-registry'
import { optionSchema } from '@/lib/ai-table/output-types'
import { and, eq, gt, inArray, isNotNull, ne, sql } from 'drizzle-orm'

// ============================================================================
// Table Management
// ============================================================================

/**
 * List all tables for the authenticated user
 */
export const listTables = os
  .use(authMiddleware)
  .input(z.object({}))
  .handler(async ({ context }) => {
    const tables = await db.query.aiTables.findMany({
      where: eq(aiTables.userId, context.user.id),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      // with: {
      //   user: {
      //     columns: {
      //       id: true,
      //       name: true,
      //       email: true,
      //     },
      //   },
      // },
    })

    return tables
  })

/**
 * Create a new table with an initial "Main" column
 */
export const createTable = os
  .use(authMiddleware)
  .input(
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(1).max(255),
    }),
  )
  .handler(async ({ input, context }) => {
    // Create table and main column in a transaction
    const result = await db.transaction(async (tx) => {
      // Create table
      const [newTable] = await tx
        .insert(aiTables)
        .values({
          ...(input.id && { id: input.id }),
          userId: context.user.id,
          name: input.name,
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

      return newTable
    })

    return result
  })

/**
 * Get table details with columns and record count
 */
export const getTable = os
  .use(authMiddleware)
  .input(
    z.object({
      tableId: z.string().uuid(),
    }),
  )
  .handler(async ({ input, context }) => {
    const table = await db.query.aiTables.findFirst({
      where: and(
        eq(aiTables.id, input.tableId),
        eq(aiTables.userId, context.user.id),
      ),
      with: {
        columns: {
          orderBy: (columns, { asc }) => [asc(columns.createdAt)],
        },
      },
    })

    if (!table) {
      throw new Error('Table not found')
    }

    // Get record count
    const recordCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(aiTableRecords)
      .where(eq(aiTableRecords.tableId, input.tableId))
      .then((result) => result[0]?.count ?? 0)

    return {
      ...table,
      recordCount,
    }
  })

/**
 * Delete a table and all related data
 */
export const deleteTable = os
  .use(authMiddleware)
  .input(
    z.object({
      tableId: z.string().uuid(),
    }),
  )
  .handler(async ({ input, context }) => {
    // Verify ownership and delete
    const result = await db
      .delete(aiTables)
      .where(
        and(
          eq(aiTables.id, input.tableId),
          eq(aiTables.userId, context.user.id),
        ),
      )
      .returning()

    if (result.length === 0) {
      throw new Error('Table not found')
    }

    return { success: true }
  })

/**
 * Update table metadata (e.g., name, description, columnSizing)
 */
export const updateTable = os
  .use(authMiddleware)
  .input(
    z.object({
      tableId: z.string().uuid(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional().nullable(),
      columnSizing: z.record(z.string(), z.number()).optional().nullable(),
      columnOrder: z.array(z.string()).optional().nullable(),
      columnPinning: z
        .object({
          left: z.array(z.string()).optional(),
          right: z.array(z.string()).optional(),
        })
        .optional()
        .nullable(),
    }),
  )
  .handler(async ({ input, context }) => {
    // Verify table ownership
    const table = await db.query.aiTables.findFirst({
      where: and(
        eq(aiTables.id, input.tableId),
        eq(aiTables.userId, context.user.id),
      ),
    })

    if (!table) {
      throw new Error('Table not found')
    }

    const updatedFields = {
      ...(input.name && { name: input.name }),
      ...(input.description && {
        description: input.description,
      }),
      ...(input.columnSizing && {
        columnSizing: input.columnSizing,
      }),
      ...(input.columnPinning && {
        columnPinning: input.columnPinning,
      }),
      ...(input.columnOrder && {
        columnOrder: input.columnOrder,
      }),
    }

    if (Object.keys(updatedFields).length === 0) {
      return table
    }

    const [updated] = await db
      .update(aiTables)
      .set(updatedFields)
      .where(eq(aiTables.id, input.tableId))
      .returning()

    if (!updated) {
      throw new Error('Failed to update table')
    }

    return updated
  })

// ============================================================================
// Column Operations
// ============================================================================

/**
 * Get all columns for a table
 */
export const getColumns = os
  .use(authMiddleware)
  .input(
    z.object({
      tableId: z.string().uuid(),
    }),
  )
  .handler(async ({ input, context }) => {
    // Verify table ownership
    const table = await db.query.aiTables.findFirst({
      where: and(
        eq(aiTables.id, input.tableId),
        eq(aiTables.userId, context.user.id),
      ),
    })

    if (!table) {
      throw new Error('Table not found')
    }

    const columns = await db.query.aiTableColumns.findMany({
      where: eq(aiTableColumns.tableId, input.tableId),
      orderBy: (c, { asc }) => [asc(c.createdAt)],
    })

    return columns
  })

const createColumnContract = oc.input(
  z.object({
    tableId: z
      .string()
      .uuid()
      .describe('The ID of the table to create the column in'),
    name: z
      .string()
      .min(1)
      .max(255)
      .describe('The name of the column to create'),
    description: z
      .string()
      .optional()
      .describe('The description of the column to create'),
    outputType: aiTableOutputTypeSchema
      .default('text')
      .describe('The output type of the column to create'),
    aiPrompt: z
      .string()
      .default('')
      .describe(
        'If the column is AI-generated, the prompt that tells the AI how to generate values',
      ),
    outputTypeConfig: z
      .object({
        options: z.array(optionSchema).optional(),
        maxSelections: z.number().int().positive().optional(),
        dateFormat: z.string().optional(),
      })
      .optional()
      .describe(
        'The configuration for the output type of the column to create',
      ),
  }),
)

/**
 * Create a new column in a table
 */
export const createColumn = implement(createColumnContract)
  .use(authMiddleware)
  .handler(async ({ input, context }) => {
    // Verify table ownership
    const table = await db.query.aiTables.findFirst({
      where: and(
        eq(aiTables.id, input.tableId),
        eq(aiTables.userId, context.user.id),
      ),
    })

    if (!table) {
      throw new Error('Table not found')
    }

    // Validate outputTypeConfig matches outputType
    if (input.outputTypeConfig) {
      const validation = validateOutputTypeConfig(
        input.outputType,
        input.outputTypeConfig,
      )
      if (!validation.success) {
        throw new Error(
          validation.error || 'Invalid configuration for output type',
        )
      }
    }

    const result = await db.transaction(async (tx) => {
      // Create column
      const [newColumn] = await tx
        .insert(aiTableColumns)
        .values({
          tableId: input.tableId,
          name: input.name,
          description: input.description,
          outputType: input.outputType,
          aiPrompt: input.aiPrompt,
          outputTypeConfig: input.outputTypeConfig ?? null,
        })
        .returning()

      // Get all existing records
      const records = await tx.query.aiTableRecords.findMany({
        where: eq(aiTableRecords.tableId, input.tableId),
      })

      // Create cells for all existing records
      let createdCells: (typeof aiTableCells.$inferSelect)[] = []
      if (records.length > 0) {
        const cellsToInsert = records.map((record) => ({
          recordId: record.id,
          columnId: newColumn.id,
          value: null,
        }))

        createdCells = await tx
          .insert(aiTableCells)
          .values(cellsToInsert)
          .returning()
      }

      return { column: newColumn, cells: createdCells }
    })

    // TODO: Trigger Inngest job for AI columns (Phase 3)
    // if (input.type === 'ai_generated' && result.cells.length > 0) {
    //   await inngest.send({
    //     name: 'ai/compute.trigger',
    //     data: { columnId: result.column.id, tableId: input.tableId }
    //   })
    // }

    return result
  })

const updateColumnContract = oc.input(
  z.object({
    columnId: z.string().uuid(),
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    outputType: aiTableOutputTypeSchema.optional(),
    aiPrompt: z.string().optional(),
    outputTypeConfig: z
      .object({
        options: z.array(optionSchema).optional(),
        maxSelections: z.number().int().positive().optional(),
        dateFormat: z.string().optional(),
      })
      .optional()
      .nullable(),
  }),
)

export const updateColumn = implement(updateColumnContract)
  .use(authMiddleware)
  .handler(async ({ input, context }) => {
    // Verify ownership through table
    const column = await db.query.aiTableColumns.findFirst({
      where: eq(aiTableColumns.id, input.columnId),
      with: {
        table: true,
      },
    })

    if (!column || column.table.userId !== context.user.id) {
      throw new Error('Column not found')
    }

    // Validate outputTypeConfig matches outputType
    const finalOutputType = input.outputType || column.outputType
    if (input.outputTypeConfig) {
      const validation = validateOutputTypeConfig(
        finalOutputType,
        input.outputTypeConfig,
      )
      if (!validation.success) {
        throw new Error(
          validation.error || 'Invalid configuration for output type',
        )
      }
    }

    const [updated] = await db
      .update(aiTableColumns)
      .set({
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
        ...(input.outputType && { outputType: input.outputType }),
        ...(input.aiPrompt !== undefined && { aiPrompt: input.aiPrompt }),
        ...(input.outputTypeConfig !== undefined && {
          outputTypeConfig: input.outputTypeConfig,
        }),
      })
      .where(eq(aiTableColumns.id, input.columnId))
      .returning()

    return updated
  })

/**
 * Delete a column and its cells
 */
export const deleteColumn = os
  .use(authMiddleware)
  .input(
    z.object({
      columnId: z.string().uuid(),
    }),
  )
  .handler(async ({ input, context }) => {
    // Verify ownership through table
    const column = await db.query.aiTableColumns.findFirst({
      where: eq(aiTableColumns.id, input.columnId),
      with: {
        table: true,
      },
    })

    if (!column || column.table.userId !== context.user.id) {
      throw new Error('Column not found')
    }

    // Prevent deleting primary columns
    if (column.primary) {
      throw new Error('Cannot delete primary column')
    }

    // Prevent deleting the last column
    const columnCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(aiTableColumns)
      .where(eq(aiTableColumns.tableId, column.tableId))
      .then((result) => result[0]?.count ?? 0)

    if (columnCount <= 1) {
      throw new Error('Cannot delete the last column')
    }

    await db.delete(aiTableColumns).where(eq(aiTableColumns.id, input.columnId))

    return { success: true }
  })

// ============================================================================
// Record Operations
// ============================================================================

/**
 * Get all records for a table (without cell data)
 */
export const getRecords = os
  .use(authMiddleware)
  .input(
    z.object({
      tableId: z.string().uuid(),
    }),
  )
  .handler(async ({ input, context }) => {
    // Verify table ownership
    const table = await db.query.aiTables.findFirst({
      where: and(
        eq(aiTables.id, input.tableId),
        eq(aiTables.userId, context.user.id),
      ),
    })

    if (!table) {
      throw new Error('Table not found')
    }

    const records = await db.query.aiTableRecords.findMany({
      where: eq(aiTableRecords.tableId, input.tableId),
      orderBy: (r, { asc }) => [asc(r.createdAt)],
    })

    return records
  })

/**
 * Create a new record with empty cells for all columns
 */
export const createRecord = os
  .use(authMiddleware)
  .input(
    z.object({
      id: z.string().uuid().optional(),
      tableId: z.string().uuid(),
    }),
  )
  .handler(async ({ input, context }) => {
    // Verify table ownership
    const table = await db.query.aiTables.findFirst({
      where: and(
        eq(aiTables.id, input.tableId),
        eq(aiTables.userId, context.user.id),
      ),
    })

    if (!table) {
      throw new Error('Table not found')
    }

    const result = await db.transaction(async (tx) => {
      // Create record
      const [newRecord] = await tx
        .insert(aiTableRecords)
        .values({
          ...(input.id && { id: input.id }),
          tableId: input.tableId,
        })
        .returning()

      // Get all columns
      const columns = await tx.query.aiTableColumns.findMany({
        where: eq(aiTableColumns.tableId, input.tableId),
      })

      // Create cells for all columns
      let createdCells: (typeof aiTableCells.$inferSelect)[] = []
      if (columns.length > 0) {
        const cellsToInsert = columns.map((column) => ({
          recordId: newRecord.id,
          columnId: column.id,
          value: null,
        }))

        createdCells = await tx
          .insert(aiTableCells)
          .values(cellsToInsert)
          .returning()
      }

      return { record: newRecord, cells: createdCells }
    })

    // TODO: Trigger Inngest for AI columns (Phase 3)

    return result
  })

/**
 * Add multiple rows to a table, setting the primary column value for each row
 */
export const addRowsWithValues = os
  .use(authMiddleware)
  .input(
    z.object({
      tableId: z.string().uuid(),
      values: z.array(z.string()).min(1),
    }),
  )
  .handler(async ({ input, context }) => {
    // Verify table ownership
    const table = await db.query.aiTables.findFirst({
      where: and(
        eq(aiTables.id, input.tableId),
        eq(aiTables.userId, context.user.id),
      ),
    })

    if (!table) {
      throw new Error('Table not found')
    }

    const result = await db.transaction(async (tx) => {
      // Get primary column
      const primaryColumn = await tx.query.aiTableColumns.findFirst({
        where: and(
          eq(aiTableColumns.tableId, input.tableId),
          eq(aiTableColumns.primary, true),
        ),
      })

      if (!primaryColumn) {
        throw new Error('Primary column not found')
      }

      // Get all columns
      const columns = await tx.query.aiTableColumns.findMany({
        where: eq(aiTableColumns.tableId, input.tableId),
      })

      const createdRecords: (typeof aiTableRecords.$inferSelect)[] = []
      const createdCells: (typeof aiTableCells.$inferSelect)[] = []

      // Create a record for each value
      for (const value of input.values) {
        // Create record
        const [newRecord] = await tx
          .insert(aiTableRecords)
          .values({
            tableId: input.tableId,
          })
          .returning()

        createdRecords.push(newRecord)

        // Create cells for all columns
        const cellsToInsert = columns.map((column) => ({
          recordId: newRecord.id,
          columnId: column.id,
          value: column.id === primaryColumn.id ? value : null,
        }))

        const insertedCells = await tx
          .insert(aiTableCells)
          .values(cellsToInsert)
          .returning()

        createdCells.push(...insertedCells)
      }

      return { records: createdRecords, cells: createdCells }
    })

    return result
  })

/**
 * Delete a record and its cells
 */
export const deleteRecord = os
  .use(authMiddleware)
  .input(
    z.object({
      recordId: z.string().uuid(),
    }),
  )
  .handler(async ({ input, context }) => {
    // Verify ownership through table
    const record = await db.query.aiTableRecords.findFirst({
      where: eq(aiTableRecords.id, input.recordId),
      with: {
        table: true,
      },
    })

    if (!record || record.table.userId !== context.user.id) {
      throw new Error('Record not found')
    }

    await db.delete(aiTableRecords).where(eq(aiTableRecords.id, input.recordId))

    return { success: true }
  })

// ============================================================================
// Cell Operations
// ============================================================================

/**
 * Get all cells for a table (initial load)
 */
export const getCells = os
  .use(authMiddleware)
  .input(
    z.object({
      tableId: z.string().uuid(),
    }),
  )
  .handler(async ({ input, context }) => {
    // Verify table ownership
    const table = await db.query.aiTables.findFirst({
      where: and(
        eq(aiTables.id, input.tableId),
        eq(aiTables.userId, context.user.id),
      ),
    })

    if (!table) {
      throw new Error('Table not found')
    }

    // Get all cells for this table via records
    const cells = await db
      .select({
        id: aiTableCells.id,
        recordId: aiTableCells.recordId,
        columnId: aiTableCells.columnId,
        value: aiTableCells.value,
        computeStatus: aiTableCells.computeStatus,
        computeError: aiTableCells.computeError,
        computeJobId: aiTableCells.computeJobId,
        createdAt: aiTableCells.createdAt,
        updatedAt: aiTableCells.updatedAt,
      })
      .from(aiTableCells)
      .innerJoin(aiTableRecords, eq(aiTableCells.recordId, aiTableRecords.id))
      .where(eq(aiTableRecords.tableId, input.tableId))

    return cells
  })

/**
 * Update a cell value
 */
export const updateCell = os
  .use(authMiddleware)
  .input(
    z.object({
      cellId: z.string().uuid(),
      value: z.string().optional(),
    }),
  )
  .handler(async ({ input, context }) => {
    // Verify ownership through table
    const cell = await db.query.aiTableCells.findFirst({
      where: eq(aiTableCells.id, input.cellId),
      with: {
        record: {
          with: {
            table: true,
          },
        },
        column: true,
      },
    })

    if (!cell || cell.record.table.userId !== context.user.id) {
      throw new Error('Cell not found')
    }

    // Update cell value
    const [updated] = await db
      .update(aiTableCells)
      .set({
        ...(input.value && { value: input.value }),
        updatedAt: new Date(),
      })
      .where(eq(aiTableCells.id, input.cellId))
      .returning()

    if (!updated) {
      throw new Error('Failed to update cell')
    }

    // TODO: Trigger dependent AI columns (Phase 3)

    return updated
  })

/**
 * Get table updates since a given timestamp (delta sync)
 */
export const getTableUpdates = os
  .use(authMiddleware)
  .input(
    z.object({
      tableId: z.string().uuid(),
      since: z.date(),
    }),
  )
  .handler(async ({ input, context }) => {
    // Verify table ownership
    const table = await db.query.aiTables.findFirst({
      where: and(
        eq(aiTables.id, input.tableId),
        eq(aiTables.userId, context.user.id),
      ),
    })

    if (!table) {
      throw new Error('Table not found')
    }

    // Get updated cells
    const updatedCells = await db
      .select({
        id: aiTableCells.id,
        recordId: aiTableCells.recordId,
        columnId: aiTableCells.columnId,
        value: aiTableCells.value,
        computeStatus: aiTableCells.computeStatus,
        computeError: aiTableCells.computeError,
        computeJobId: aiTableCells.computeJobId,
        createdAt: aiTableCells.createdAt,
        updatedAt: aiTableCells.updatedAt,
      })
      .from(aiTableCells)
      .innerJoin(aiTableRecords, eq(aiTableCells.recordId, aiTableRecords.id))
      .where(
        and(
          eq(aiTableRecords.tableId, input.tableId),
          gt(aiTableCells.updatedAt, input.since),
        ),
      )

    // Get updated records
    const updatedRecords = await db.query.aiTableRecords.findMany({
      where: and(
        eq(aiTableRecords.tableId, input.tableId),
        gt(aiTableRecords.updatedAt, input.since),
      ),
    })

    // Get updated columns (usually doesn't change often)
    const updatedColumns = await db.query.aiTableColumns.findMany({
      where: and(
        eq(aiTableColumns.tableId, input.tableId),
        gt(aiTableColumns.createdAt, input.since), // Columns don't have updatedAt
      ),
    })

    return {
      cells: updatedCells,
      records: updatedRecords,
      columns: updatedColumns,
      timestamp: new Date(),
    }
  })

// ============================================================================
// AI Computation Triggers
// ============================================================================

/**
 * Manually trigger computation for all AI cells in a table
 */
export const triggerComputeAllCells = os
  .use(authMiddleware)
  .input(
    z.object({
      tableId: z.string().uuid(),
    }),
  )
  .handler(async ({ input, context }) => {
    console.log('triggerComputeAllCells', input)
    // Verify table ownership
    const table = await db.query.aiTables.findFirst({
      where: and(
        eq(aiTables.id, input.tableId),
        eq(aiTables.userId, context.user.id),
      ),
    })

    if (!table) {
      throw new Error('Table not found')
    }

    // Get all columns with AI prompts for this table
    const aiColumns = await db.query.aiTableColumns.findMany({
      where: and(
        eq(aiTableColumns.tableId, input.tableId),
        isNotNull(aiTableColumns.aiPrompt),
        ne(aiTableColumns.aiPrompt, ''),
      ),
    })

    if (aiColumns.length === 0) {
      return {
        success: true,
        triggered: 0,
        message: 'No AI columns found in this table',
      }
    }

    // Get all cells for AI columns
    const aiColumnIds = aiColumns.map((col) => col.id)
    const aiCells = await db
      .select()
      .from(aiTableCells)
      .innerJoin(aiTableRecords, eq(aiTableCells.recordId, aiTableRecords.id))
      .where(
        and(
          eq(aiTableRecords.tableId, input.tableId),
          inArray(aiTableCells.columnId, aiColumnIds),
        ),
      )

    // Set all cells to pending status
    const cellIds = aiCells.map((row) => row.ai_table_cells.id)
    if (cellIds.length > 0) {
      await db
        .update(aiTableCells)
        .set({
          computeStatus: 'pending',
          updatedAt: new Date(),
        })
        .where(inArray(aiTableCells.id, cellIds))
    }

    // Send individual Inngest event for each cell
    const events = cellIds.map((cellId) => ({
      name: 'ai/cell.compute' as const,
      data: { cellId },
    }))

    if (events.length > 0) {
      await inngest.send(events)
    }

    return {
      success: true,
      triggered: cellIds.length,
      message: `Triggered computation for ${cellIds.length} AI cells`,
    }
  })
