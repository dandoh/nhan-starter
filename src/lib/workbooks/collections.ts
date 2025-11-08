import { queryClient } from '@/integrations/tanstack-query/root-provider'

import type { Workbook } from '@/db/schema'
import { orpcClient } from '@/orpc/client'
import { queryCollectionOptions } from '@tanstack/query-db-collection'

import {
  createCollection,
  CollectionConfig,
} from '@tanstack/db'

// ============================================================================
// Workbooks List Collection
// ============================================================================
export const workbooksCollection = createCollection(
  queryCollectionOptions<Workbook>({
    queryClient,
    queryKey: ['workbooks', 'workbooks'],
    queryFn: async () => {
      const workbooks = await orpcClient.workbooks.list({})
      return workbooks
    },
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
  })
)
