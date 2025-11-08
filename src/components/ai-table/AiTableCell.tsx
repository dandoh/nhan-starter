import { memo, useCallback, useState, useEffect } from 'react'
import { useLiveQuery, eq, and } from '@tanstack/react-db'
import type { TableCollections } from '@/lib/ai-table/collections'
import type { OutputType } from '@/lib/ai-table/output-types'
import { getOutputTypeDefinition } from '@/lib/ai-table/output-type-registry'

type TableCellProps = {
  recordId: string
  columnId: string
  collections: TableCollections
}

/**
 * Memoized table cell component that queries its own data
 * Only re-renders when the specific cell data changes
 */
export const AiTableCell = memo(function TableCell({
  recordId,
  columnId,
  collections,
}: TableCellProps) {
  // Live query for this specific cell only
  const { data: cell } = useLiveQuery((q) =>
    q
      .from({ cell: collections.cellsCollection })
      .where(({ cell }) =>
        and(eq(cell.recordId, recordId), eq(cell.columnId, columnId)),
      )
      .findOne(),
  )

  // Query the column for output type configuration
  const { data: column } = useLiveQuery((q) =>
    q
      .from({ column: collections.columnsCollection })
      .where(({ column }) => eq(column.id, columnId))
      .findOne(),
  )

  // Local state for controlled input
  const [localValue, setLocalValue] = useState(cell?.value || '')
  const [isEditing, setIsEditing] = useState(false)

  // Sync server value to local state only when not editing
  useEffect(() => {
    if (!isEditing) {
      setLocalValue(cell?.value || '')
    }
  }, [cell?.value, isEditing])

  const updateCell = useCallback(
    (newValue: string) => {
      if (cell?.id) {
        collections.cellsCollection.update(cell.id, (draft) => {
          draft.value = newValue
        })
      } else {
        // Create cell if it doesn't exist (shouldn't happen normally)
        console.warn('Cell not found for update:', { recordId, columnId })
      }
    },
    [cell?.id, collections.cellsCollection, recordId, columnId],
  )

  const handleChange = useCallback(
    (newValue: string) => {
      setLocalValue(newValue)
    },
    [],
  )

  const handleBlur = useCallback(() => {
    setIsEditing(false)
    // Update server with final value
    if (localValue !== cell?.value) {
      updateCell(localValue)
    }
  }, [localValue, cell?.value, updateCell])

  const handleFocus = useCallback(() => {
    setIsEditing(true)
  }, [])

  if (!column) {
    return null
  }

  // Show spinner for computing cells
  if (cell?.computeStatus === 'computing') {
    return (
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">Generating...</span>
      </div>
    )
  }

  // Show error state
  if (cell?.computeStatus === 'error' && cell.computeError) {
    return (
      <div className="flex items-center gap-2 text-destructive">
        <span className="text-sm">⚠️ {cell.computeError}</span>
      </div>
    )
  }

  // All cells are editable - use appropriate input component based on outputType
  const outputType = (column.outputType || 'text') as OutputType
  const outputTypeConfig = column.outputTypeConfig
  const outputTypeDef = getOutputTypeDefinition(outputType)
  const EditableCell = outputTypeDef.EditableCell

  // Pass raw value - deserialization is handled inside EditableCell
  return (
    <div className="h-full w-full flex items-stretch">
      <EditableCell
        value={localValue}
        config={outputTypeConfig}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        isEditing={isEditing}
      />
    </div>
  )
})
