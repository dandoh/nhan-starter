import { queryClient } from '@/integrations/tanstack-query/root-provider'

import type { FileTableWorkflow } from '@/db/schema'
import { orpcClient } from '@/orpc/client'
import {
  queryCollectionOptions,
  QueryCollectionUtils,
} from '@tanstack/query-db-collection'

import {
  Collection,
  createCollection,
  createOptimisticAction,
  createPacedMutations,
  debounceStrategy,
} from '@tanstack/db'

// ============================================================================
// File Table Workflows Collection
// ============================================================================
export const fileTableWorkflowsCollection = createCollection(
  // @ts-expect-error(2769)
  queryCollectionOptions<FileTableWorkflow>({
    queryClient,
    queryKey: ['file-table-workflows', 'workflows'],
    queryFn: async () => {
      // Fetch all workflows for the user - TanStack DB will filter client-side
      const workflows = await orpcClient.fileTableWorkflows.list({})
      return workflows
    },
    getKey: (workflow) => workflow.id,
    onInsert: async ({ transaction }) => {
      const { modified: newWorkflow } = transaction.mutations[0]
      await orpcClient.fileTableWorkflows.create({
        id: newWorkflow.id,
      })
    },

    onDelete: async () => {
      // Workflows are deleted when blocks are deleted (cascade)
      // No explicit delete endpoint needed
    },

    onUpdate: async ({ transaction }) => {
      for (const mutation of transaction.mutations) {
        const { original, changes } = mutation
        await orpcClient.fileTableWorkflows.update({
          fileTableWorkflowId: original.id,
          files: changes.files || undefined,
          suggestedColumns: changes.suggestedColumns || undefined,
        })
      }
    },
  }),
) as unknown as Collection<
  FileTableWorkflow,
  string,
  QueryCollectionUtils<FileTableWorkflow>
>

// ============================================================================
// Debounced Update Mutation
// ============================================================================

export const updateFileTableWorkflow = createOptimisticAction<{
  workflowId: string
  files?: FileTableWorkflow['files']
  suggestedColumns?: FileTableWorkflow['suggestedColumns']
}>({
  onMutate: ({ workflowId, ...rest }) => {
    fileTableWorkflowsCollection.update(workflowId, (draft) => {
      if (rest.files !== undefined) {
        draft.files = rest.files
      }
      if (rest.suggestedColumns !== undefined) {
        draft.suggestedColumns = rest.suggestedColumns
      }
    })
  },

  mutationFn: async ({ workflowId, files, suggestedColumns }) => {
    await orpcClient.fileTableWorkflows.update({
      fileTableWorkflowId: workflowId,
      files,
      suggestedColumns,
    })
    await fileTableWorkflowsCollection.utils.refetch()
  },
})
