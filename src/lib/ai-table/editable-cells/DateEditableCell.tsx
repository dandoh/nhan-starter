import React, { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar as CalendarIcon } from 'lucide-react'
import { format, parse, isValid } from 'date-fns'
import { cn } from '@/lib/utils'
import type { EditableCellProps } from '../output-type-registry'
import type { DateConfig } from '../output-types'

function parseDateValue(value: string | null): Date | null {
  if (!value) return null

  // Try common date formats
  const formats = [
    'yyyy-MM-dd', // 2024-01-15
    'MM/dd/yyyy', // 01/15/2024
    'dd/MM/yyyy', // 15/01/2024
    'MMM dd, yyyy', // Jan 15, 2024
    'MMMM dd, yyyy', // January 15, 2024
  ]

  for (const dateFormat of formats) {
    try {
      const parsed = parse(value, dateFormat, new Date())
      if (isValid(parsed)) {
        return parsed
      }
    } catch {
      // Try next format
    }
  }

  // Try ISO format as fallback
  const date = new Date(value)
  return isValid(date) ? date : null
}

function formatDateValue(
  value: string | null,
  dateFormat: string = 'YYYY-MM-DD',
): string {
  if (!value) return ''

  const date = parseDateValue(value)
  if (!date) return value // Return as-is if can't parse

  // Map custom formats to date-fns formats
  const formatMap: Record<string, string> = {
    'YYYY-MM-DD': 'yyyy-MM-dd',
    'MM/DD/YYYY': 'MM/dd/yyyy',
    'DD/MM/YYYY': 'dd/MM/yyyy',
    'MMM DD, YYYY': 'MMM dd, yyyy',
    'MMMM DD, YYYY': 'MMMM dd, yyyy',
  }

  const dateFnsFormat = formatMap[dateFormat] || formatMap['YYYY-MM-DD']

  try {
    return format(date, dateFnsFormat)
  } catch {
    return value
  }
}

export function DateEditableCell({
  value,
  config,
  onChange,
  onBlur,
  onFocus,
}: EditableCellProps) {
  // Deserialize: simple string passthrough
  const displayValue = value || ''
  const dateConfig = config as DateConfig | null
  const dateFormat = dateConfig?.dateFormat || 'YYYY-MM-DD'
  const [isOpen, setIsOpen] = useState(false)
  const [date, setDate] = useState<Date | undefined>(
    displayValue ? parseDateValue(displayValue) || undefined : undefined,
  )

  // Sync date state when value changes
  useEffect(() => {
    if (displayValue) {
      const parsed = parseDateValue(displayValue)
      setDate(parsed || undefined)
    } else {
      setDate(undefined)
    }
  }, [displayValue])

  // Map date format to input type
  const inputType = dateFormat.includes('YYYY') ? 'date' : 'text'

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setDate(selectedDate)
      // Format date according to config
      const formatMap: Record<string, string> = {
        'YYYY-MM-DD': 'yyyy-MM-dd',
        'MM/DD/YYYY': 'MM/dd/yyyy',
        'DD/MM/YYYY': 'dd/MM/yyyy',
        'MMM DD, YYYY': 'MMM dd, yyyy',
        'MMMM DD, YYYY': 'MMMM dd, yyyy',
      }
      const dateFnsFormat = formatMap[dateFormat] || formatMap['YYYY-MM-DD']
      const formatted = format(selectedDate, dateFnsFormat)
      onChange(formatted)
      setIsOpen(false)
      if (onBlur) onBlur()
    }
  }

  if (inputType === 'date') {
    // Use native date input for YYYY-MM-DD format
    return (
      <Input
        type="date"
        value={displayValue || ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onFocus={onFocus}
        className="h-full w-full border-none bg-transparent focus-visible:border-none focus-visible:ring-0 shadow-none px-2 py-1 text-sm"
      />
    )
  } else {
    // Use calendar popover for other formats
    const formattedValue = displayValue
      ? formatDateValue(displayValue, dateFormat)
      : ''
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div
            className="h-full w-full cursor-pointer px-2 py-1 text-sm flex items-center gap-2"
            onFocus={onFocus}
            onClick={() => setIsOpen(true)}
          >
            <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className={cn(!formattedValue && 'text-muted-foreground')}>
              {formattedValue || 'Select date...'}
            </span>
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0"
          align="start"
          onInteractOutside={() => {
            setIsOpen(false)
            if (onBlur) onBlur()
          }}
        >
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
          />
        </PopoverContent>
      </Popover>
    )
  }
}

