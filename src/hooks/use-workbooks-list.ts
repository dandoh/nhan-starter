import { useLiveQuery } from '@tanstack/react-db'
import { workbooksCollection } from '@/lib/ai-table/collections'

/**
 * Hook to get and manage the list of user's workbooks
 */
export function useWorkbooksList() {
  // Live query for all workbooks
  const { data: workbooks = [], isLoading } = useLiveQuery((q) =>
    q
      .from({ workbook: workbooksCollection })
      .orderBy(({ workbook }) => workbook.createdAt, 'desc'),
  )

  const createWorkbook = (name: string, description?: string) => {
    const newWorkbook = {
      id: crypto.randomUUID(),
      userId: '', // Will be set by server
      name,
      description: description || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      blockOrder: {},
    }

    workbooksCollection.insert(newWorkbook)
  }

  const updateWorkbook = (
    workbookId: string,
    updates: { name?: string; description?: string | null },
  ) => {
    workbooksCollection.update(workbookId, (workbook) => ({
      ...workbook,
      ...updates,
      updatedAt: new Date(),
    }))
  }

  const deleteWorkbook = (workbookId: string) => {
    workbooksCollection.delete(workbookId)
  }

  return {
    workbooks,
    isLoading,
    createWorkbook,
    updateWorkbook,
    deleteWorkbook,
  }
}
