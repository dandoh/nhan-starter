import { queryClient } from '@/integrations/tanstack-query/root-provider'

import type {
  AiTable,
  AiTableColumn,
  AiTableRecord,
  AiTableCell,
} from '@/db/schema'
import type { OutputTypeConfig } from '@/lib/ai-table/output-types'
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
  serverFnUpdateTable,
} from '@/serverFns/ai-tables'
import { queryCollectionOptions } from '@tanstack/query-db-collection'

import {
  createPacedMutations,
  debounceStrategy,
  queueStrategy,
  createTransaction,
  createCollection,
} from '@tanstack/db'

// ============================================================================
// Tables List Collection
// ============================================================================
export const tablesCollection = createCollection(
  queryCollectionOptions<AiTable>({
    queryClient,
    queryKey: ['ai-tables', 'tables'],
    queryFn: async () => {
      const tables = await serverFnListTables({})
      return tables
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

    onUpdate: async ({ transaction }) => {
      for (const mutation of transaction.mutations) {
        const { original, changes } = mutation
        await serverFnUpdateTable({
          data: {
            tableId: original.id,
            ...changes,
          },
        })
      }
    },
  }),
)

export const updateTableColumnSizing = createPacedMutations<
  {
    tableId: string
    columnSizing: Record<string, number>
  },
  AiTable
>({
  onMutate: ({ tableId, columnSizing }) => {
    tablesCollection.update(tableId, (draft) => {
      draft.columnSizing = columnSizing
    })
  },

  mutationFn: async ({ transaction }) => {
    for (const mutation of transaction.mutations) {
      const { original, changes, modified } = mutation
      await serverFnUpdateTable({
        data: {
          tableId: (original as AiTable).id,
          ...changes,
        },
      })

      tablesCollection.utils.writeUpdate(modified)
    }
  },
  strategy: debounceStrategy({ wait: 500 }),
})

// ============================================================================
// Table-Specific Collections Factory
// ============================================================================

export function createTableCollections(tableId: string) {
  // Cells collection (declared first so other collections can reference it)
  const cellsCollection = createCollection(
    queryCollectionOptions<AiTableCell>({
      queryClient,
      queryKey: ['ai-tables', tableId, 'cells'],
      queryFn: async () => {
        const cells = await serverFnGetCells({
          data: {
            tableId,
          },
        })
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
    queryCollectionOptions<AiTableColumn>({
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
    queryCollectionOptions<AiTableRecord>({
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
    columnsCollection: columnsCollection,
    recordsCollection: recordsCollection,
    cellsCollection: cellsCollection,
  }
}

export type TableCollections = ReturnType<typeof createTableCollections>
