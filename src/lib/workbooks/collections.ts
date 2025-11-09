import { queryClient } from '@/integrations/tanstack-query/root-provider'

import type { Workbook, WorkbookBlock } from '@/db/schema'
import { orpcClient } from '@/orpc/client'
import {
  queryCollectionOptions,
  QueryCollectionUtils,
} from '@tanstack/query-db-collection'

import { Collection, createCollection } from '@tanstack/db'
import { tablesCollection } from '../ai-table/collections'

// ============================================================================
// Workbooks List Collection
// ============================================================================
export const workbooksCollection = createCollection(
  // @ts-expect-error(2769)
  queryCollectionOptions<Workbook>({
    queryClient,
    queryKey: ['workbooks', 'workbooks'],
    queryFn: async () => {
      const workbooks = await orpcClient.workbooks.list({})
      return workbooks
    },
    getKey: (workbook) => workbook.id,
    onInsert: async ({ transaction }) => {
      const { modified: newWorkbook } = transaction.mutations[0]
      await orpcClient.workbooks.create({
        id: newWorkbook.id,
        name: newWorkbook.name,
        description: newWorkbook.description || undefined,
      })
    },

    onDelete: async ({ transaction }) => {
      const { original } = transaction.mutations[0]
      await orpcClient.workbooks.delete({
        workbookId: original.id,
      })
    },

    onUpdate: async ({ transaction }) => {
      for (const mutation of transaction.mutations) {
        const { original, changes } = mutation
        await orpcClient.workbooks.update({
          workbookId: original.id,
          ...changes,
        })
      }
    },
  }),
) as unknown as Collection<Workbook, string, QueryCollectionUtils<Workbook>>

// ============================================================================
// Workbook-Specific Collections Factory
// ============================================================================

export function createWorkbookCollections(workbookId: string) {
  // Blocks collection
  const blocksCollection = createCollection(
    // @ts-expect-error(2769)
    queryCollectionOptions<WorkbookBlock>({
      queryClient,
      queryKey: ['workbooks', workbookId, 'blocks'],
      queryFn: async () => {
        const blocks = await orpcClient.workbooks.getBlocks({
          workbookId,
        })
        return blocks
      },
      getKey: (block) => block.id,

      onInsert: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          const { modified: newBlock } = mutation
          await orpcClient.workbooks.createBlock({
            id: newBlock.id,
            workbookId,
            blockType: newBlock.blockType,
          })

          tablesCollection.utils.refetch()
        }
      },

      onUpdate: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          const { original, changes } = mutation
          await orpcClient.workbooks.updateBlock({
            blockId: original.id,
            tableId: changes.tableId || undefined,
          })
        }
      },

      onDelete: async ({ transaction }) => {
        for (const mutation of transaction.mutations) {
          const { original } = mutation
          await orpcClient.workbooks.deleteBlock({
            blockId: original.id,
          })
        }
      },
    }),
  ) as unknown as Collection<
    WorkbookBlock,
    string,
    QueryCollectionUtils<WorkbookBlock>
  >

  return {
    blocksCollection,
  }
}

export type BlocksCollection = ReturnType<typeof createWorkbookCollections>['blocksCollection']
export type WorkbookCollections = typeof workbooksCollection
