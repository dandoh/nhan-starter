import { useLiveQuery } from '@tanstack/react-db'
import { tablesCollection } from '@/lib/ai-table/collections'

/**
 * Hook to get and manage the list of user's tables
 */
export function useTablesList() {
  // Live query for all tables
  const { data: tables = [], isLoading } = useLiveQuery((q) =>
    q.from({ table: tablesCollection }).orderBy(({ table }) => table.createdAt, 'desc'),
  )

  const createTable = (name: string) => {
    const newTable = {
      id: crypto.randomUUID(),
      userId: '', // Will be set by server
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Optimistic insert
    tablesCollection.insert(newTable)
  }

  const deleteTable = (tableId: string) => {
    // Optimistic delete
    tablesCollection.delete(tableId)
  }

  return {
    tables,
    isLoading,
    createTable,
    deleteTable,
  }
}

