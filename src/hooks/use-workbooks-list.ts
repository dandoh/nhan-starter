import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { client } from '@/orpc/client'

export function useWorkbooksList() {
  const queryClient = useQueryClient()

  // Fetch all workbooks
  const { data: workbooks = [], isLoading } = useQuery({
    queryKey: ['workbooks'],
    queryFn: async () => {
      const result = await client.workbooks.list()
      return result
    },
  })

  // Create workbook mutation
  const createWorkbookMutation = useMutation({
    mutationFn: async (input: { name: string; description?: string }) => {
      return await client.workbooks.create(input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workbooks'] })
    },
  })

  // Delete workbook mutation
  const deleteWorkbookMutation = useMutation({
    mutationFn: async (workbookId: string) => {
      return await client.workbooks.delete({ workbookId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workbooks'] })
    },
  })

  // Update workbook mutation
  const updateWorkbookMutation = useMutation({
    mutationFn: async (input: {
      workbookId: string
      name?: string
      description?: string | null
    }) => {
      return await client.workbooks.update(input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workbooks'] })
    },
  })

  return {
    workbooks,
    isLoading,
    createWorkbook: (name: string, description?: string) =>
      createWorkbookMutation.mutate({ name, description }),
    deleteWorkbook: (workbookId: string) =>
      deleteWorkbookMutation.mutate(workbookId),
    updateWorkbook: (
      workbookId: string,
      updates: { name?: string; description?: string | null },
    ) => updateWorkbookMutation.mutate({ workbookId, ...updates }),
    isCreating: createWorkbookMutation.isPending,
    isDeleting: deleteWorkbookMutation.isPending,
    isUpdating: updateWorkbookMutation.isPending,
  }
}

