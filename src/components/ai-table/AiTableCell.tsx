import { memo, useCallback, useState, useEffect } from 'react'
import { useLiveQuery, eq, and } from '@tanstack/react-db'
import type { BelongToTableEntitiesCollections } from '@/lib/ai-table/collections'
import type { OutputType } from '@/lib/ai-table/output-types'
import { getOutputTypeDefinition } from '@/lib/ai-table/output-type-registry'
import type {
  AiTableCell as AiTableCellType,
  AiTableColumn as AiTableColumnType,
} from '@/db/schema'

type TableCellProps = {
  recordId: string
  columnId: string
} & BelongToTableEntitiesCollections

type TableCellInternalProps = {
  cell: AiTableCellType
  column: AiTableColumnType
  cellsCollection: BelongToTableEntitiesCollections['cellsCollection']
} & BelongToTableEntitiesCollections

/**
 * Internal component that handles all hooks and logic
 * Only rendered when cell and column are guaranteed to exist
 */
function AiTableCellInternal({
  cell,
  column,
  updateCellValue,
}: TableCellInternalProps) {
  // Get output type definition - can safely use column.outputType
  const outputType = column.outputType as OutputType
  const outputTypeDef = getOutputTypeDefinition(outputType)
  const [isEditing, setIsEditing] = useState(false)
  const onBlur = useCallback(() => {
    setIsEditing(false)
  }, [])
  const onFocus = useCallback(() => {
    setIsEditing(true)
  }, [])

  const onChange = useCallback(
    (newValue: Record<string, unknown>) => {
      updateCellValue({ cellId: cell.id, value: newValue })
    },
    [cell.id, updateCellValue],
  )

  // Show spinner for computing cells
  if (cell.computeStatus === 'computing') {
    return (
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">Generating...</span>
      </div>
    )
  }

  // Show error state
  if (cell.computeStatus === 'error' && cell.computeError) {
    return (
      <div className="flex items-center gap-2 text-destructive">
        <span className="text-sm">⚠️ {cell.computeError}</span>
      </div>
    )
  }

  // All cells are editable - use appropriate input component based on outputType
  const outputTypeConfig = column.outputTypeConfig
  const EditableCell = outputTypeDef.EditableCell

  // Pass value in object format (already converted above)
  return (
    <div className="h-full w-full px-2 py-1">
      <EditableCell
        value={cell.value}
        config={outputTypeConfig}
        onChange={onChange}
        onBlur={onBlur}
        onFocus={onFocus}
        isEditing={isEditing}
      />
    </div>
  )
}

/**
 * Memoized table cell component that queries its own data
/**
 * Memoized table cell component that queries its own data.
 * Only re-renders when the specific cell data or column data changes.
 */
export const AiTableCell = memo(function AiTableCellMemo({
  recordId,
  columnId,
  cellsCollection,
  columnsCollection,
  recordsCollection,
  updateCellValue,
}: TableCellProps) {
  // Live query for this specific cell only
  const { data: cell } = useLiveQuery((q) =>
    q
      .from({ cell: cellsCollection })
      .where(({ cell }) =>
        and(eq(cell.recordId, recordId), eq(cell.columnId, columnId)),
      )
      .findOne(),
  )

  // Live query for the specific column configuration
  const { data: column } = useLiveQuery((q) =>
    q
      .from({ column: columnsCollection })
      .where(({ column }) => eq(column.id, columnId))
      .findOne(),
  )

  // Early return if cell or column is not available
  if (!cell || !column) {
    return null
  }

  // Render internal component with guaranteed cell and column
  return (
    <AiTableCellInternal
      cell={cell}
      column={column}
      cellsCollection={cellsCollection}
      columnsCollection={columnsCollection}
      recordsCollection={recordsCollection}
      updateCellValue={updateCellValue}
    />
  )
})
