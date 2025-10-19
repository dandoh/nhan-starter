import { memo, useCallback, useState, useEffect, useRef } from 'react'
import { useLiveQuery, eq, and } from '@tanstack/react-db'
import { Input } from '@/components/ui/input'
import type { TableCollections } from '@/lib/ai-table/collections'
import { TableCell as TableCellUI } from '@/components/ui/table'

type TableCellProps = {
  recordId: string
  columnId: string
  collections: TableCollections
}

/**
 * Memoized table cell component that queries its own data
 * Only re-renders when the specific cell data changes
 */
export const TableCell = memo(function TableCell({
  recordId,
  columnId,
  collections,
}: TableCellProps) {
  // Live query for this specific cell only
  const { data: cell } = useLiveQuery((q) =>
    q
      .from({ cell: collections.cells })
      .where(({ cell }) =>
        and(eq(cell.recordId, recordId), eq(cell.columnId, columnId)),
      )
      .findOne(),
  )

  // Local state for controlled input
  const [localValue, setLocalValue] = useState(cell?.value || '')
  const [isEditing, setIsEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync server value to local state only when not editing
  useEffect(() => {
    if (!isEditing) {
      setLocalValue(cell?.value || '')
    }
  }, [cell?.value, isEditing])

  const updateCell = useCallback(
    (newValue: string) => {
      if (cell?.id) {
        collections.cells.update(cell.id, (draft) => {
          draft.value = newValue
        })
      } else {
        // Create cell if it doesn't exist (shouldn't happen normally)
        console.warn('Cell not found for update:', { recordId, columnId })
      }
    },
    [cell?.id, collections.cells, recordId, columnId],
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value)
  }

  const handleBlur = () => {
    setIsEditing(false)
    // Update server with final value
    if (localValue !== cell?.value) {
      updateCell(localValue)
    }
  }

  const handleFocus = () => {
    setIsEditing(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur()
    }
    if (e.key === 'Escape') {
      setLocalValue(cell?.value || '')
      inputRef.current?.blur()
    }
  }

  // Show spinner for computing cells
  if (cell?.computeStatus === 'computing') {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">Generating...</span>
      </div>
    )
  }

  // Show error state
  if (cell?.computeStatus === 'error' && cell.computeError) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-destructive">
        <span className="text-sm">⚠️ {cell.computeError}</span>
      </div>
    )
  }

  // Editable input
  return (
    <Input
      ref={inputRef}
      value={localValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className="border-none bg-transparent focus-visible:ring-1"
      placeholder="Enter text..."
    />
  )
})
