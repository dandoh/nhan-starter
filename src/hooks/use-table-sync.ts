import { useEffect, useRef, useState } from 'react'
import {
  Column,
  createTableCollections,
  type TableCollections,
} from '@/lib/ai-table/collections'
import { serverFnGetTableUpdates } from '@/serverFns/ai-tables'

/**
 * Hook to sync a table's data with the server using delta updates
 * Polls every 3 seconds for changes and applies them to local collections
 */
export function useTableSync(tableId: string): TableCollections {
  // Use ref instead of state - no need to trigger re-renders
  const lastSyncRef = useRef<Date>(new Date())

  // Create collections once and store in ref for stable reference
  const collectionsRef = useRef<TableCollections | null>(null)
  if (!collectionsRef.current) {
    collectionsRef.current = createTableCollections(tableId)
  }
  const collections = collectionsRef.current

  useEffect(() => {
    // Polling interval for delta updates
    const interval = setInterval(async () => {
      try {
        // Fetch only changes since last sync
        const updates = await serverFnGetTableUpdates({
          data: {
            tableId,
            since: lastSyncRef.current,
          },
        })

        // Apply incremental updates to collections
        // Cells - most frequently updated
        if (updates.cells && updates.cells.length > 0) {
          collections.cellsCollection.utils.writeBatch(() => {
            collections.cellsCollection.utils.writeUpsert(updates.cells)
          })
        }

        // Update cursor for next sync (ref mutation doesn't trigger re-render)
        lastSyncRef.current = updates.timestamp
      } catch (error) {
        console.error('Table sync error:', error)
        // Don't throw - just log and retry on next interval
      }
    }, 3000) // Poll every 3 seconds

    return () => clearInterval(interval)
  }, [tableId, collections])

  return collections
}
