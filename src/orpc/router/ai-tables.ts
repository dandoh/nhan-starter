import { os, ORPCError } from '@orpc/server'
import * as z from 'zod'
import { authMiddleware } from '../middleware/auth'
import { db } from '@/db'
import {
  aiTables,
  aiTableColumns,
  aiTableRecords,
  aiTableCells,
} from '@/db/schema'
import { eq, and, gt, sql } from 'drizzle-orm'

// ============================================================================
// Table Management
// ============================================================================

/**
 * List all tables for the authenticated user
 */
export const listTables = os
  .use(authMiddleware)
  .handler(async ({ context }) => {
    const tables = await db.query.aiTables.findMany({
      where: eq(aiTables.userId, context.user.id),
      orderBy: (tables, { desc }) => [desc(tables.createdAt)],
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

      // Create default "Main" column
      await tx.insert(aiTableColumns).values({
        name: 'Main',
        tableId: newTable.id,
        position: 0,
        config: null,
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
          orderBy: (columns, { asc }) => [asc(columns.position)],
        },
      },
    })

    if (!table) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Table not found',
      })
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
      throw new ORPCError('NOT_FOUND', {
        message: 'Table not found',
      })
    }

    return { success: true }
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
      throw new ORPCError('NOT_FOUND', {
        message: 'Table not found',
      })
    }

    const columns = await db.query.aiTableColumns.findMany({
      where: eq(aiTableColumns.tableId, input.tableId),
      orderBy: (columns, { asc }) => [asc(columns.position)],
    })

    return columns
  })

/**
 * Create a new column and initialize cells for existing records
 */
export const createColumn = os
  .use(authMiddleware)
  .input(
    z.object({
      tableId: z.string().uuid(),
      name: z.string().min(1).max(255),
      config: z.record(z.string(), z.any()).optional(), // Allow arbitrary JSON object
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
      throw new ORPCError('NOT_FOUND', {
        message: 'Table not found',
      })
    }

    const result = await db.transaction(async (tx) => {
      // Get current max position
      const maxPosition = await tx
        .select({ max: sql<number>`COALESCE(MAX(position), -1)::int` })
        .from(aiTableColumns)
        .where(eq(aiTableColumns.tableId, input.tableId))
        .then((result) => result[0]?.max ?? -1)

      // Create column
      const [newColumn] = await tx
        .insert(aiTableColumns)
        .values({
          tableId: input.tableId,
          name: input.name,
          config: input.config ?? null,
          position: maxPosition + 1,
        })
        .returning()

      // Get all existing records
      const records = await tx.query.aiTableRecords.findMany({
        where: eq(aiTableRecords.tableId, input.tableId),
      })

      // Create cells for all existing records
      let createdCells: typeof aiTableCells.$inferSelect[] = []
      if (records.length > 0) {
        const cellsToInsert = records.map((record) => ({
          recordId: record.id,
          columnId: newColumn.id,
          value: null,
        }))

        createdCells = await tx.insert(aiTableCells).values(cellsToInsert).returning()
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
export const updateColumn = os
  .use(authMiddleware)
  .input(
    z.object({
      columnId: z.string().uuid(),
      name: z.string().min(1).max(255).optional(),
      config: z.record(z.string(), z.any()).optional(), // Allow arbitrary JSON object
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
      throw new ORPCError('NOT_FOUND', {
        message: 'Column not found',
      })
    }

    const [updated] = await db
      .update(aiTableColumns)
      .set({
        ...(input.name && { name: input.name }),
        ...(input.config && { config: input.config }),
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
      throw new ORPCError('NOT_FOUND', {
        message: 'Column not found',
      })
    }

    // Prevent deleting the last column
    const columnCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(aiTableColumns)
      .where(eq(aiTableColumns.tableId, column.tableId))
      .then((result) => result[0]?.count ?? 0)

    if (columnCount <= 1) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Cannot delete the last column',
      })
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
      throw new ORPCError('NOT_FOUND', {
        message: 'Table not found',
      })
    }

    const records = await db.query.aiTableRecords.findMany({
      where: eq(aiTableRecords.tableId, input.tableId),
      orderBy: (records, { asc }) => [asc(records.position)],
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
      throw new ORPCError('NOT_FOUND', {
        message: 'Table not found',
      })
    }

    const result = await db.transaction(async (tx) => {
      // Get current max position
      const maxPosition = await tx
        .select({ max: sql<number>`COALESCE(MAX(position), -1)::int` })
        .from(aiTableRecords)
        .where(eq(aiTableRecords.tableId, input.tableId))
        .then((result) => result[0]?.max ?? -1)

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
      let createdCells: typeof aiTableCells.$inferSelect[] = []
      if (columns.length > 0) {
        const cellsToInsert = columns.map((column) => ({
          recordId: newRecord.id,
          columnId: column.id,
          value: null,
        }))

        createdCells = await tx.insert(aiTableCells).values(cellsToInsert).returning()
      }

      return { record: newRecord, cells: createdCells }
    })

    // TODO: Trigger Inngest for AI columns (Phase 3)

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
      throw new ORPCError('NOT_FOUND', {
        message: 'Record not found',
      })
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
      throw new ORPCError('NOT_FOUND', {
        message: 'Table not found',
      })
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
        version: aiTableCells.version,
        createdAt: aiTableCells.createdAt,
        updatedAt: aiTableCells.updatedAt,
      })
      .from(aiTableCells)
      .innerJoin(aiTableRecords, eq(aiTableCells.recordId, aiTableRecords.id))
      .where(eq(aiTableRecords.tableId, input.tableId))

    return cells
  })

/**
 * Update a cell value with optimistic locking
 */
export const updateCell = os
  .use(authMiddleware)
  .input(
    z.object({
      cellId: z.string().uuid(),
      value: z.string().optional(),
      version: z.number().optional(),
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
      throw new ORPCError('NOT_FOUND', {
        message: 'Cell not found',
      })
    }

    // Update with version check (optimistic locking)
    const [updated] = await db
      .update(aiTableCells)
      .set({
        ...(input.value && { value: input.value }),
        version: sql`${aiTableCells.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(aiTableCells.id, input.cellId),
          input.version ? eq(aiTableCells.version, input.version) : undefined,
        ),
      )
      .returning()

    if (!updated) {
      throw new ORPCError('CONFLICT', {
        message: 'Cell was modified by another user. Please refresh.',
      })
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
      throw new ORPCError('NOT_FOUND', {
        message: 'Table not found',
      })
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
        version: aiTableCells.version,
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
