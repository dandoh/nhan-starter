import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { queryClient } from '@/integrations/tanstack-query/root-provider'

import type {
  AiTable,
  AiTableColumn,
  AiTableRecord,
  AiTableCell,
  Workbook,
  WorkbookBlock,
} from '@/db/schema'
import type { OutputTypeConfig } from '@/lib/ai-table/output-types'
import { useRef } from 'react'
import {
  serverFnCreateTable,
  serverFnDeleteTable,
  serverFnGetCells,
  serverFnGetColumns,
  serverFnListTables,
  serverFnUpdateCell,
  serverFnUpdateColumn,
  serverFnCreateColumn,
  serverFnDeleteColumn,
  serverFnGetRecords,
  serverFnCreateRecord,
  serverFnDeleteRecord,
} from '@/serverFns/ai-tables'
import {
  serverFnCreateWorkbook,
  serverFnDeleteWorkbook,
  serverFnListWorkbooks,
  serverFnUpdateWorkbook,
} from '@/serverFns/workbooks'

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
      const tables = await serverFnListTables({})
      return tables as Table[]
    },
    getKey: (table) => table.id,
    onInsert: async ({ transaction }) => {
      const { modified: newTable } = transaction.mutations[0]
      await serverFnCreateTable({
        data: {
          name: newTable.name,
        },
      })
    },

    onDelete: async ({ transaction }) => {
      const { original } = transaction.mutations[0]
      await serverFnDeleteTable({
        data: {
          tableId: original.id,
        },
      })
    },
  }),
)

// ============================================================================
// Workbooks List Collection
// ============================================================================

export const workbooksCollection = createCollection(
  queryCollectionOptions<Workbook>({
    queryClient,
    queryKey: ['workbooks', 'list'],
    queryFn: async () => {
      const workbooks = await serverFnListWorkbooks({})
      return workbooks
    },
    getKey: (workbook) => workbook.id,
    onInsert: async ({ transaction }) => {
      const { modified: newWorkbook } = transaction.mutations[0]
      await serverFnCreateWorkbook({
        data: {
          name: newWorkbook.name,
          description: newWorkbook.description || undefined,
        },
      })
    },
    onUpdate: async ({ transaction }) => {
      const { original, changes } = transaction.mutations[0]
      await serverFnUpdateWorkbook({
        data: {
          workbookId: original.id,
          name: changes.name,
          description: changes.description,
        },
      })
    },
    onDelete: async ({ transaction }) => {
      const { original } = transaction.mutations[0]
      await serverFnDeleteWorkbook({
        data: {
          workbookId: original.id,
        },
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
        const cells = await serverFnGetCells({
          data: {
            tableId,
          },
        })
        return cells as Cell[]
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
      onDelete: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          const { modified: cell } = mutation
          cellsCollection.utils.writeDelete(cell.id)
        }

        return {
          refetch: false,
        }
      },
      onUpdate: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          const { original, changes } = mutation
          const updatedCell = await serverFnUpdateCell({
            data: {
              cellId: original.id,
              value: changes.value || undefined,
            },
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
        const columns = await serverFnGetColumns({
          data: {
            tableId,
          },
        })
        return columns
      },
      getKey: (col) => col.id,

      onInsert: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          const { modified: newColumn } = mutation
          const outputTypeConfig = newColumn.outputTypeConfig as
            | OutputTypeConfig
            | undefined
          const { cells } = await serverFnCreateColumn({
            data: {
              tableId,
              name: newColumn.name,
              type: newColumn.type,
              description: newColumn.description || undefined,
              outputType: newColumn.outputType,
              aiPrompt: newColumn.aiPrompt || '',
              outputTypeConfig,
            },
          })

          // Insert created cells into cells collection
          if (cells.length > 0) {
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

      onUpdate: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          const { original, modified } = mutation
          const outputTypeConfig = modified.outputTypeConfig as
            | OutputTypeConfig
            | undefined
          await serverFnUpdateColumn({
            data: {
              columnId: original.id,
              name: modified.name,
              type: modified.type,
              description: modified.description || undefined,
              outputType: modified.outputType,
              aiPrompt: modified.aiPrompt,
              outputTypeConfig,
            },
          })
        }
      },

      onDelete: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          const { original } = mutation
          await serverFnDeleteColumn({
            data: {
              columnId: original.id,
            },
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
        const records = await serverFnGetRecords({
          data: {
            tableId,
          },
        })
        return records
      },
      getKey: (rec) => rec.id,

      onInsert: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          const { modified: newRecord } = mutation
          const { cells } = await serverFnCreateRecord({
            data: {
              tableId,
              id: newRecord.id,
            },
          })

          // Insert created cells into cells collection
          if (cells.length > 0) {
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
          await serverFnDeleteRecord({
            data: {
              recordId: original.id,
            },
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
