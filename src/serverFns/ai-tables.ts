import { createServerFn } from '@tanstack/react-start'
import * as z from 'zod'
import { authMiddleware } from '@/serverFns/middleware/auth-middleware'
import { defineFunction } from '@/serverFns/utils'
import { db } from '@/db'
import {
  aiTables,
  aiTableColumns,
  aiTableRecords,
  aiTableCells,
} from '@/db/schema'
import { eq, and, gt, sql, inArray, ne, isNotNull } from 'drizzle-orm'
import { inngest } from '@/inngest/client'
import { optionSchema } from '@/lib/ai-table/output-types'
import { validateOutputTypeConfig } from '@/lib/ai-table/output-type-registry'

// ============================================================================
// Table Management
// ============================================================================

/**
 * List all tables for the authenticated user
 */
const listTablesDef = defineFunction({
  handler: async ({ context }) => {
    const tables = await db.query.aiTables.findMany({
      where: eq(aiTables.userId, context.user.id),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    })

    return tables
  },
})

export const serverFnListTables = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(listTablesDef.handler)

/**
 * Create a new table with an initial "Main" column
 */
const createTableDef = defineFunction({
  input: z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1).max(255),
  }),
  handler: async ({ data: input, context }) => {
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
      })

      return newTable
    })

    return result
  },
})

export const serverFnCreateTable = createServerFn({ method: 'POST' })
  .inputValidator(createTableDef.input)
  .middleware([authMiddleware])
  .handler(createTableDef.handler)

/**
 * Get table details with columns and record count
 */
const getTableDef = defineFunction({
  input: z.object({
    tableId: z.string().uuid(),
  }),
  handler: async ({ data: input, context }) => {
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
  },
})

export const serverFnGetTable = createServerFn({ method: 'GET' })
  .inputValidator(getTableDef.input)
  .middleware([authMiddleware])
  .handler(getTableDef.handler)

/**
 * Delete a table and all related data
 */
const deleteTableDef = defineFunction({
  input: z.object({
    tableId: z.string().uuid(),
  }),
  handler: async ({ data: input, context }) => {
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
  },
})

export const serverFnDeleteTable = createServerFn({ method: 'POST' })
  .inputValidator(deleteTableDef.input)
  .middleware([authMiddleware])
  .handler(deleteTableDef.handler)

// ============================================================================
// Column Operations
// ============================================================================

/**
 * Get all columns for a table
 */
const getColumnsDef = defineFunction({
  input: z.object({
    tableId: z.string().uuid(),
  }),
  handler: async ({ data: input, context }) => {
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
  },
})

export const serverFnGetColumns = createServerFn({ method: 'GET' })
  .inputValidator(getColumnsDef.input)
  .middleware([authMiddleware])
  .handler(getColumnsDef.handler)

/**
 * Create a new column and initialize cells for existing records
 */
export const serverFnCreateColumn = createServerFn({
  method: 'POST',
})
  .inputValidator(
    z.object({
      tableId: z.string().uuid(),
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      outputType: z
        .enum(['text', 'long_text', 'single_select', 'multi_select', 'date'])
        .default('text'),
      aiPrompt: z.string().default(''),
      outputTypeConfig: z
        .object({
          options: z.array(optionSchema).optional(),
          maxSelections: z.number().int().positive().optional(),
          dateFormat: z.string().optional(),
        })
        .optional(),
    }),
  )
  .middleware([authMiddleware])
  .handler(async ({ data: input, context }) => {
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

/**
 * Update column name or config
 */
const updateColumnDef = defineFunction({
  input: z.object({
    columnId: z.string().uuid(),
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    outputType: z
      .enum(['text', 'long_text', 'single_select', 'multi_select', 'date'])
      .optional(),
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
  handler: async ({ data: input, context }) => {
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
  },
})

export const serverFnUpdateColumn = createServerFn({ method: 'POST' })
  .inputValidator(updateColumnDef.input)
  .middleware([authMiddleware])
  .handler(updateColumnDef.handler)

/**
 * Delete a column and its cells
 */
const deleteColumnDef = defineFunction({
  input: z.object({
    columnId: z.string().uuid(),
  }),
  handler: async ({ data: input, context }) => {
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
  },
})

export const serverFnDeleteColumn = createServerFn({ method: 'POST' })
  .inputValidator(deleteColumnDef.input)
  .middleware([authMiddleware])
  .handler(deleteColumnDef.handler)

// ============================================================================
// Record Operations
// ============================================================================

/**
 * Get all records for a table (without cell data)
 */
const getRecordsDef = defineFunction({
  input: z.object({
    tableId: z.string().uuid(),
  }),
  handler: async ({ data: input, context }) => {
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
      orderBy: (r, { asc }) => [asc(r.position)],
    })

    return records
  },
})

export const serverFnGetRecords = createServerFn({ method: 'GET' })
  .inputValidator(getRecordsDef.input)
  .middleware([authMiddleware])
  .handler(getRecordsDef.handler)

/**
 * Create a new record with empty cells for all columns
 */
const createRecordDef = defineFunction({
  input: z.object({
    id: z.string().uuid().optional(),
    tableId: z.string().uuid(),
  }),
  handler: async ({ data: input, context }) => {
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
      // Get current max position
      const maxPosition = await tx
        .select({ max: sql<number>`COALESCE(MAX(position), -1)::int` })
        .from(aiTableRecords)
        .where(eq(aiTableRecords.tableId, input.tableId))
        .then((res) => res[0]?.max ?? -1)

      // Create record
      const [newRecord] = await tx
        .insert(aiTableRecords)
        .values({
          ...(input.id && { id: input.id }),
          tableId: input.tableId,
          position: maxPosition + 1,
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
  },
})

export const serverFnCreateRecord = createServerFn({ method: 'POST' })
  .inputValidator(createRecordDef.input)
  .middleware([authMiddleware])
  .handler(createRecordDef.handler)

/**
 * Delete a record and its cells
 */
const deleteRecordDef = defineFunction({
  input: z.object({
    recordId: z.string().uuid(),
  }),
  handler: async ({ data: input, context }) => {
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
  },
})

export const serverFnDeleteRecord = createServerFn({ method: 'POST' })
  .inputValidator(deleteRecordDef.input)
  .middleware([authMiddleware])
  .handler(deleteRecordDef.handler)

// ============================================================================
// Cell Operations
// ============================================================================

/**
 * Get all cells for a table (initial load)
 */
const getCellsDef = defineFunction({
  input: z.object({
    tableId: z.string().uuid(),
  }),
  handler: async ({ data: input, context }) => {
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
  },
})

export const serverFnGetCells = createServerFn({ method: 'GET' })
  .inputValidator(getCellsDef.input)
  .middleware([authMiddleware])
  .handler(getCellsDef.handler)

/**
 * Update a cell value
 */
const updateCellDef = defineFunction({
  input: z.object({
    cellId: z.string().uuid(),
    value: z.string().optional(),
  }),
  handler: async ({ data: input, context }) => {
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
  },
})

export const serverFnUpdateCell = createServerFn({ method: 'POST' })
  .inputValidator(updateCellDef.input)
  .middleware([authMiddleware])
  .handler(updateCellDef.handler)

/**
 * Get table updates since a given timestamp (delta sync)
 */
const getTableUpdatesDef = defineFunction({
  input: z.object({
    tableId: z.string().uuid(),
    since: z.date(),
  }),
  handler: async ({ data: input, context }) => {
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
  },
})

export const serverFnGetTableUpdates = createServerFn({ method: 'GET' })
  .inputValidator(getTableUpdatesDef.input)
  .middleware([authMiddleware])
  .handler(getTableUpdatesDef.handler)

// ============================================================================
// AI Computation Triggers
// ============================================================================

/**
 * Manually trigger computation for all AI cells in a table
 */
const triggerComputeAllCellsDef = defineFunction({
  input: z.object({
    tableId: z.string().uuid(),
  }),
  handler: async ({ data: input, context }) => {
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
  },
})

export const serverFnTriggerComputeAllCells = createServerFn({ method: 'POST' })
  .inputValidator(triggerComputeAllCellsDef.input)
  .middleware([authMiddleware])
  .handler(triggerComputeAllCellsDef.handler)
