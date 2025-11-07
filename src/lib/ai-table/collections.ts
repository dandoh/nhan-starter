import { queryClient } from '@/integrations/tanstack-query/root-provider'

import type {
  AiTable,
  AiTableColumn,
  AiTableRecord,
  AiTableCell,
} from '@/db/schema'
import type { OutputTypeConfig } from '@/lib/ai-table/output-types'
import { orpcClient } from '@/orpc/client'
import { queryCollectionOptions } from '@tanstack/query-db-collection'

import {
  createPacedMutations,
  debounceStrategy,
  createCollection,
  CollectionConfig,
} from '@tanstack/db'

// ============================================================================
// Tables List Collection
// ============================================================================
export const tablesCollection = createCollection(
  queryCollectionOptions<AiTable>({
    queryClient,
    queryKey: ['ai-tables', 'tables'],
    queryFn: async () => {
      const tables = await orpcClient.aiTables.list({})
      return tables
    },
    getKey: (table) => table.id,
    onInsert: async ({ transaction }) => {
      const { modified: newTable } = transaction.mutations[0]
      await orpcClient.aiTables.create({
        id: newTable.id,
        name: newTable.name,
      })
    },

    onDelete: async ({ transaction }) => {
      const { original } = transaction.mutations[0]
      await orpcClient.aiTables.delete({
        tableId: original.id,
      })
    },

    onUpdate: async ({ transaction }) => {
      for (const mutation of transaction.mutations) {
        const { original, changes } = mutation
        await orpcClient.aiTables.update({
          tableId: original.id,
          ...changes,
        })
      }
    },
  }) as CollectionConfig<AiTable>,
)

// Helper function to create table update mutations
function createTableUpdateMutation<Key extends keyof AiTable>(
  fieldName: Key,
  updateDraft: (draft: AiTable, value: AiTable[Key]) => void,
  debounceWait?: number,
) {
  return createPacedMutations<
    {
      tableId: string
    } & Record<Key, AiTable[Key]>,
    AiTable
  >({
    onMutate: ({ tableId, ...rest }) => {
      const value = rest[fieldName] as AiTable[Key]
      tablesCollection.update(tableId, (draft) => {
        updateDraft(draft, value)
      })
    },

    mutationFn: async ({ transaction }) => {
      for (const mutation of transaction.mutations) {
        const { original, changes, modified } = mutation
        await orpcClient.aiTables.update({
          tableId: (original as AiTable).id,
          ...changes,
        })

        tablesCollection.utils.writeUpdate(modified)
      }
    },
    strategy: debounceStrategy({ wait: debounceWait || 500 }),
  })
}

export const updateTableColumnSizing =
  createTableUpdateMutation<'columnSizing'>('columnSizing', (draft, value) => {
    draft.columnSizing = value
  })

export const updateTableColumnPinning =
  createTableUpdateMutation<'columnPinning'>(
    'columnPinning',
    (draft, value) => {
      draft.columnPinning = value
    },
  )

export const updateTableColumnOrder =
  createTableUpdateMutation<'columnOrder'>(
    'columnOrder',
    (draft, value) => {
      draft.columnOrder = value
    },
  )

export const updateTableName = createTableUpdateMutation<'name'>(
  'name',
  (draft, value) => {
    draft.name = value
  },
)

export const updateTableDescription = createTableUpdateMutation<'description'>(
  'description',
  (draft, value) => {
    draft.description = value
  },
)

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
        const cells = await orpcClient.aiTables.getCells({
          tableId,
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
          const updatedCell = await orpcClient.aiTables.updateCell({
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
    queryCollectionOptions<AiTableColumn>({
      queryClient,
      queryKey: ['ai-tables', tableId, 'columns'],
      queryFn: async () => {
        const columns = await orpcClient.aiTables.getColumns({
          tableId,
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
          const { cells } = await orpcClient.aiTables.createColumn({
            tableId,
            name: newColumn.name,
            description: newColumn.description || undefined,
            outputType: newColumn.outputType,
            aiPrompt: newColumn.aiPrompt || '',
            outputTypeConfig,
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
          await orpcClient.aiTables.updateColumn({
            columnId: original.id,
            name: modified.name,
            description: modified.description || undefined,
            outputType: modified.outputType,
            aiPrompt: modified.aiPrompt,
            outputTypeConfig,
          })
        }
      },

      onDelete: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          const { original } = mutation
          await orpcClient.aiTables.deleteColumn({
            columnId: original.id,
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
        const records = await orpcClient.aiTables.getRecords({
          tableId,
        })
        return records
      },
      getKey: (rec) => rec.id,

      onInsert: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          const { modified: newRecord } = mutation
          const { cells } = await orpcClient.aiTables.createRecord({
            tableId,
            id: newRecord.id,
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
          await orpcClient.aiTables.deleteRecord({
            recordId: original.id,
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
