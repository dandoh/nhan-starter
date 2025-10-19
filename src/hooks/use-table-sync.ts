import { useEffect, useRef, useState } from 'react'
import { Column, createTableCollections, type TableCollections } from '@/lib/ai-table/collections'
import { client } from '@/orpc/client'

/**
 * Hook to sync a table's data with the server using delta updates
 * Polls every 3 seconds for changes and applies them to local collections
 */
export function useTableSync(tableId: string): TableCollections {
  const [lastSync, setLastSync] = useState<Date>(new Date())
  
  // Create collections once and store in ref for stable reference
  const collectionsRef = useRef<TableCollections | null>(null)
  if (!collectionsRef.current) {
    collectionsRef.current = createTableCollections(tableId)
  }
  const collections = collectionsRef.current

  useEffect(() => {
    return
    // Polling interval for delta updates
    const interval = setInterval(async () => {
      try {
        // Fetch only changes since last sync
        const updates = await client.aiTables.getUpdates({
          tableId,
          since: lastSync,
        })

        // Apply incremental updates to collections
        // Cells - most frequently updated
        if (updates.cells && updates.cells.length > 0) {
          updates.cells.forEach((cell) => {
            const existing = collections.cells.get(cell.id)

            // Only update if server version is newer (avoid overwriting optimistic updates)
            if (!existing || cell.version >= existing.version) {
              if (existing) {
                // Update existing cell
                collections.cells.update(cell.id, () => cell)
              } else {
                // Insert new cell
                collections.cells.insert(cell)
              }
            }
          })
        }

        // Records - occasionally updated
        if (updates.records && updates.records.length > 0) {
          updates.records.forEach((record) => {
            const existing = collections.records.get(record.id)
            if (existing) {
              collections.records.update(record.id, () => record)
            } else {
              collections.records.insert(record)
            }
          })
        }

        // Columns - rarely updated
        if (updates.columns && updates.columns.length > 0) {
          updates.columns.forEach((col) => {
            const existing = collections.columns.get(col.id)
            // Cast to proper Column type
            const column = col
            if (existing) {
              collections.columns.update(column.id, () => column)
            } else {
              collections.columns.insert(column)
            }
          })
        }

        // Update cursor for next sync
        setLastSync(updates.timestamp)
      } catch (error) {
        console.error('Table sync error:', error)
        // Don't throw - just log and retry on next interval
      }
    }, 3000) // Poll every 3 seconds

    return () => clearInterval(interval)
  }, [tableId, lastSync, collections])

  return collections
}

