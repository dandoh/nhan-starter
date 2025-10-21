import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { queryClient } from '@/integrations/tanstack-query/root-provider'

import { client } from '@/orpc/client'
import type {
  AiTable,
  AiTableColumn,
  AiTableRecord,
  AiTableCell,
} from '@/db/schema'
import type { OutputTypeConfig } from '@/lib/ai-table/output-types'

// Create a single query client instance for collections with no refetching

// Re-export types for convenience
export type Table = AiTable
export type Column = AiTableColumn
export type Record = AiTableRecord
export type Cell = AiTableCell

// ============================================================================
// Tables List Collection
// ============================================================================

export const tablesCollection = createCollection(
  queryCollectionOptions<Table>({
    queryClient,
    queryKey: ['ai-tables', 'tables'],
    queryFn: async () => {
      const tables = await client.aiTables.list()
      return tables
    },
    getKey: (table) => table.id,
    onInsert: async ({ transaction }) => {
      const { modified: newTable } = transaction.mutations[0]
      await client.aiTables.create({
        name: newTable.name,
      })
    },

    onDelete: async ({ transaction }) => {
      const { original } = transaction.mutations[0]
      await client.aiTables.delete({
        tableId: original.id,
      })
    },
  }),
)

// ============================================================================
// Table-Specific Collections Factory
// ============================================================================

export function createTableCollections(tableId: string) {
  // Cells collection (declared first so other collections can reference it)
  const cellsCollection = createCollection(
    queryCollectionOptions<Cell>({
      queryClient,
      queryKey: ['ai-tables', tableId, 'cells'],
      queryFn: async () => {
        const cells = await client.aiTables.getCells({ tableId })
        return cells
      },
      getKey: (cell) => cell.id,
      onInsert: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          const { modified: newCell } = mutation
          cellsCollection.utils.writeInsert(newCell)
        }
        return {
          refetch: false,
        }
      },
      onUpdate: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          const { original, changes } = mutation
          const updatedCell = await client.aiTables.updateCell({
            cellId: original.id,
            value: changes.value || undefined,
          })
          cellsCollection.utils.writeUpdate(updatedCell)
        }

        return {
          refetch: false,
        }
      },
    }),
  )

  // Columns collection
  const columnsCollection = createCollection(
    queryCollectionOptions<Column>({
      queryClient,
      queryKey: ['ai-tables', tableId, 'columns'],
      queryFn: async () => {
        const columns = await client.aiTables.getColumns({ tableId })
        return columns as Column[]
      },
      getKey: (col) => col.id,

      onInsert: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          const { modified: newColumn } = mutation
          const config = newColumn.config as OutputTypeConfig | undefined
          const { cells } = await client.aiTables.createColumn({
            tableId,
            name: newColumn.name,
            type: newColumn.type,
            description: newColumn.description || undefined,
            outputType: newColumn.outputType,
            config,
          })

          // Insert created cells into cells collection
          if (cells && cells.length > 0) {
            cells.forEach((cell) => {
              const existing = cellsCollection.get(cell.id)
              if (existing) {
                cellsCollection.update(cell.id, () => cell)
              } else {
                cellsCollection.insert(cell as Cell)
              }
            })
          }
        }
      },

      onUpdate: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          const { original, modified } = mutation
          const config = modified.config as OutputTypeConfig | undefined
          await client.aiTables.updateColumn({
            columnId: original.id,
            name: modified.name,
            type: modified.type,
            description: modified.description || undefined,
            outputType: modified.outputType,
            config,
          })
        }
      },

      onDelete: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          const { original } = mutation
          await client.aiTables.deleteColumn({
            columnId: original.id,
          })
        }
      },
    }),
  )

  // Records collection
  const recordsCollection = createCollection(
    queryCollectionOptions<Record>({
      queryClient,
      queryKey: ['ai-tables', tableId, 'records'],
      queryFn: async () => {
        const records = await client.aiTables.getRecords({ tableId })
        return records as Record[]
      },
      getKey: (rec) => rec.id,

      onInsert: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          const { modified: newRecord } = mutation
          const { cells } = await client.aiTables.createRecord({
            tableId,
            id: newRecord.id,
          })

          // Insert created cells into cells collection
          if (cells && cells.length > 0) {
            cells.forEach((cell) => {
              const existing = cellsCollection.get(cell.id)
              if (existing) {
                cellsCollection.update(cell.id, () => cell)
              } else {
                cellsCollection.insert(cell)
              }
            })
          }
        }
      },

      onDelete: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          const { original } = mutation
          await client.aiTables.deleteRecord({
            recordId: original.id,
          })
        }
      },
    }),
  )

  return {
    columns: columnsCollection,
    records: recordsCollection,
    cells: cellsCollection,
  }
}

export type TableCollections = ReturnType<typeof createTableCollections>
