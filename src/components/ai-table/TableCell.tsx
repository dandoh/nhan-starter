import { memo, useCallback, useState, useEffect, useRef } from 'react'
import { useLiveQuery, eq, and } from '@tanstack/react-db'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Calendar } from 'lucide-react'
import type { TableCollections } from '@/lib/ai-table/collections'
import type { OutputType } from '@/lib/ai-table/output-types'
import {
  getDisplayValue,
  parseMultiSelectValue,
  getBadgeColors,
} from '@/lib/ai-table/formatters'

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

  // Query the column to check if it's an AI column
  const { data: column } = useLiveQuery((q) =>
    q
      .from({ column: collections.columns })
      .where(({ column }) => eq(column.id, columnId))
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

  // Check if this is an AI column (non-editable)
  const isAiColumn = column?.type === 'ai'
  const outputType = (column?.outputType || 'text') as OutputType
  const outputTypeConfig = column?.outputTypeConfig

  // AI columns are read-only - display value with type-specific rendering
  if (isAiColumn) {
    // Single select - display as badge
    if (outputType === 'single_select') {
      if (!localValue) {
        return <div className="px-3 py-2 text-sm text-muted-foreground">-</div>
      }
      
      const colors = getBadgeColors(localValue)
      return (
        <div className="px-3 py-2">
          <Badge
            style={{
              backgroundColor: colors.backgroundColor,
              color: colors.textColor,
              borderColor: colors.borderColor,
            }}
          >
            {localValue}
          </Badge>
        </div>
      )
    }

    // Multi select - display as multiple badges
    if (outputType === 'multi_select') {
      const values = parseMultiSelectValue(localValue)
      
      if (values.length === 0) {
        return <div className="px-3 py-2 text-sm text-muted-foreground">-</div>
      }
      
      return (
        <div className="flex flex-wrap gap-1 px-3 py-2">
          {values.map((value, index) => {
            const colors = getBadgeColors(value)
            return (
              <Badge
                key={index}
                style={{
                  backgroundColor: colors.backgroundColor,
                  color: colors.textColor,
                  borderColor: colors.borderColor,
                }}
              >
                {value}
              </Badge>
            )
          })}
        </div>
      )
    }

    // Date - display with calendar icon
    if (outputType === 'date') {
      if (!localValue) {
        return <div className="px-3 py-2 text-sm text-muted-foreground">-</div>
      }
      
      const displayValue = getDisplayValue(localValue, outputType, outputTypeConfig)
      return (
        <div className="flex items-center gap-2 px-3 py-2 text-sm">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{displayValue}</span>
        </div>
      )
    }

    // Long text - display with scroll
    if (outputType === 'long_text') {
      if (!localValue) {
        return <div className="px-3 py-2 text-sm text-muted-foreground"></div>
      }
      
      return (
        <div className="px-3 py-2 text-sm max-h-32 overflow-y-auto whitespace-pre-wrap scrollbar scrollbar-track-background scrollbar-thumb-primary-300 ">
          {localValue}
        </div>
      )
    }

    // Text (default) - single line
    return (
      <div className="px-3 py-2 text-sm overflow-hidden text-ellipsis">
        {localValue || <span className="text-muted-foreground"></span>}
      </div>
    )
  }

  // Manual columns are editable
  return (
    <Input
      ref={inputRef}
      value={localValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className="border-none bg-transparent focus-visible:ring-1 focus-visible:ring-inset"
    />
  )
})
