import React, { useState, useEffect } from 'react'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Calendar as CalendarIcon, X, Type, FileText, Tag, Tags } from 'lucide-react'
import { format, parse, isValid } from 'date-fns'
import { cn } from '@/lib/utils'
import type {
  OutputType,
  OutputTypeConfig,
  SingleSelectConfig,
  MultiSelectConfig,
  DateConfig,
} from './output-types'
import {
  textConfigSchema,
  longTextConfigSchema,
  singleSelectConfigSchema,
  multiSelectConfigSchema,
  dateConfigSchema,
} from './output-types'

// ============================================================================
// Type Definitions
// ============================================================================

export interface EditableCellProps {
  value: string
  config?: OutputTypeConfig | null
  onChange: (value: string) => void
  onBlur?: () => void
  onFocus?: () => void
  isEditing?: boolean
}

export interface OutputTypeDefinition {
  id: OutputType
  label: string
  icon: React.ComponentType<{ className?: string }>
  tooltip: string
  description: string

  // Config validation schema
  configSchema: z.ZodObject<any>

  // Schema generation for AI
  createAISchema: (config: OutputTypeConfig | null) => z.ZodObject<any>

  // Value conversion
  serializeAiResponse: (aiResponse: any) => string // AI response → storage

  deserialize: (stored: string | null) => any // storage → display value

  // React rendering - editable version for table cells
  renderEditable: (props: EditableCellProps) => React.ReactNode
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse a multi-select value from JSON string to array
 */
function parseMultiSelectValue(value: string | null): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Parse a date value from string
 */
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

/**
 * Format a date value according to specified format
 */
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

// ============================================================================
// Output Type Definitions
// ============================================================================

const TEXT_TYPE: OutputTypeDefinition = {
  id: 'text',
  label: '📝 Text - Brief single-line text',
  icon: Type,
  tooltip: 'Single-line text',
  description: 'A brief single-line text response',

  configSchema: textConfigSchema,

  createAISchema: () =>
    z.object({
      value: z.string().describe('A brief single-line text response'),
    }),

  serializeAiResponse: (response) => response.value || '',

  deserialize: (value) => value || '',

  renderEditable: ({ value, onChange, onBlur, onFocus }) => {
    // Deserialize: simple string passthrough
    const displayValue = value || ''
    return (
      <Input
        value={displayValue}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onFocus={onFocus}
        className="h-full w-full border-none bg-transparent focus-visible:border-none focus-visible:ring-0 shadow-none px-2 py-1 text-sm"
        placeholder=""
      />
    )
  },
}

const LONG_TEXT_TYPE: OutputTypeDefinition = {
  id: 'long_text',
  label: '📄 Long Text - Multi-paragraph text',
  icon: FileText,
  tooltip: 'Multi-paragraph text',
  description: 'A detailed multi-paragraph text response',

  configSchema: longTextConfigSchema,

  createAISchema: () =>
    z.object({
      value: z.string().describe('A detailed multi-paragraph text response'),
    }),

  serializeAiResponse: (response) => response.value || '',

  deserialize: (value) => value || '',

  renderEditable: ({ value, onChange, onBlur, onFocus }) => {
    // Deserialize: simple string passthrough
    const displayValue = value || ''
    return (
      <Textarea
        value={displayValue}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onFocus={onFocus}
        className="h-full w-full min-h-[60px] border-none bg-transparent focus-visible:border-none focus-visible:ring-0 shadow-none px-2 py-1 text-sm resize-none"
        placeholder=""
        rows={3}
      />
    )
  },
}

const SINGLE_SELECT_TYPE: OutputTypeDefinition = {
  id: 'single_select',
  label: '🏷️ Single Select - One choice from options',
  icon: Tag,
  tooltip: 'Single choice',
  description: 'AI chooses one value, displayed as a colored badge',

  configSchema: singleSelectConfigSchema,

  createAISchema: (config) => {
    const selectConfig = config as SingleSelectConfig | null
    const options = selectConfig?.options

    if (options && options.length > 0) {
      // With predefined options: validate against enum
      const enumValues = options.map((opt) => opt.value) as [
        string,
        ...string[],
      ]
      return z.object({
        value: z
          .enum(enumValues)
          .describe(
            `Choose exactly ONE from these options: ${enumValues.join(', ')}`,
          ),
      })
    } else {
      // Free-form: any string value
      return z.object({
        value: z
          .string()
          .describe('A single appropriate value based on the context'),
      })
    }
  },

  serializeAiResponse: (response) => response.value || '',

  deserialize: (value) => value || '',

  renderEditable: ({ value, config, onChange, onBlur, onFocus }) => {
    // Deserialize: simple string passthrough
    const displayValue = value || ''
    const selectConfig = config as SingleSelectConfig | null
    const options = selectConfig?.options || []

    if (options.length > 0) {
      // Use Select dropdown for predefined options
      return (
        <Select
          value={displayValue || ''}
          onValueChange={onChange}
          onOpenChange={(open) => {
            if (!open && onBlur) onBlur()
          }}
        >
          <SelectTrigger
            onFocus={onFocus}
            className="h-full w-full border-none bg-transparent focus-visible:border-none focus-visible:ring-0 shadow-none px-2 py-1 text-sm data-[placeholder]:text-muted-foreground"
          >
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    } else {
      // Use Input for free-form text
      return (
        <Input
          value={displayValue || ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onFocus={onFocus}
          className="h-full w-full border-none bg-transparent focus-visible:border-none focus-visible:ring-0 shadow-none px-2 py-1 text-sm"
          placeholder=""
        />
      )
    }
  },
}

const MULTI_SELECT_TYPE: OutputTypeDefinition = {
  id: 'multi_select',
  label: '🏷️ Multi Select - Multiple choices',
  icon: Tags,
  tooltip: 'Multiselect',
  description: 'AI chooses multiple values, displayed as multiple badges',

  configSchema: multiSelectConfigSchema,

  createAISchema: (config) => {
    const selectConfig = config as MultiSelectConfig | null
    const options = selectConfig?.options
    const maxSelections = selectConfig?.maxSelections

    if (options && options.length > 0) {
      // With predefined options: validate against enum array
      const enumValues = options.map((opt) => opt.value) as [
        string,
        ...string[],
      ]
      let arraySchema = z.array(z.enum(enumValues))

      if (maxSelections && maxSelections > 0) {
        arraySchema = arraySchema
          .max(maxSelections)
          .describe(
            `Choose up to ${maxSelections} values from: ${enumValues.join(', ')}`,
          )
      } else {
        arraySchema = arraySchema.describe(
          `Choose multiple values from: ${enumValues.join(', ')}`,
        )
      }

      return z.object({
        values: arraySchema,
      })
    } else {
      // Free-form: array of strings
      let arraySchema = z.array(z.string())

      if (maxSelections && maxSelections > 0) {
        arraySchema = arraySchema
          .max(maxSelections)
          .describe(
            `Return up to ${maxSelections} appropriate values based on the context`,
          )
      } else {
        arraySchema = arraySchema.describe(
          'Return multiple appropriate values based on the context',
        )
      }

      return z.object({
        values: arraySchema,
      })
    }
  },

  serializeAiResponse: (response) => {
    const values = response.values || []
    return JSON.stringify(values)
  },

  deserialize: (value) => parseMultiSelectValue(value),

  renderEditable: ({ value, config, onChange, onBlur, onFocus }) => {
    // Deserialize: parse JSON string to array
    const displayValue = parseMultiSelectValue(value)
    const selectConfig = config as MultiSelectConfig | null
    const options = selectConfig?.options || []
    const maxSelections = selectConfig?.maxSelections
    const values = Array.isArray(displayValue) ? displayValue : []
    const [isOpen, setIsOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    const handleToggle = (optionValue: string) => {
      const newValues = values.includes(optionValue)
        ? values.filter((v) => v !== optionValue)
        : maxSelections && values.length >= maxSelections
          ? values
          : [...values, optionValue]
      onChange(JSON.stringify(newValues))
    }

    const handleRemove = (optionValue: string, e: React.MouseEvent) => {
      e.stopPropagation()
      const newValues = values.filter((v) => v !== optionValue)
      onChange(JSON.stringify(newValues))
    }

    // Filter options based on search query
    const filteredOptions = options.filter((option) =>
      option.value.toLowerCase().includes(searchQuery.toLowerCase()),
    )

    if (options.length > 0) {
      // Use Command component for searchable multi-select
      return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <div
              className="h-full w-full cursor-pointer py-1 px-2 text-sm flex items-center gap-1 flex-wrap min-h-[28px]"
              onFocus={onFocus}
              onClick={() => setIsOpen(true)}
            >
              {values.length > 0 ? (
                values.map((val, index) => {
                  return (
                    <Badge
                      variant="secondary"
                      key={index}
                      className="text-sm flex items-center gap-1 pr-1"
                    >
                      {val}
                      <button
                        type="button"
                        onClick={(e) => handleRemove(val, e)}
                        className="ml-1 rounded-full hover:bg-black/20 p-0.5"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleRemove(val, e as any)
                          }
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )
                })
              ) : (
                <span className="text-muted-foreground">Select...</span>
              )}
            </div>
          </PopoverTrigger>
          <PopoverContent
            className="w-64 p-0"
            align="start"
            onInteractOutside={() => {
              setIsOpen(false)
              setSearchQuery('')
              if (onBlur) onBlur()
            }}
          >
            <Command>
              <CommandInput
                placeholder="Search options..."
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                <CommandEmpty>No options found.</CommandEmpty>
                <CommandGroup>
                  {filteredOptions.map((option) => {
                    const isSelected = values.includes(option.value)
                    const isDisabled = Boolean(
                      maxSelections &&
                        values.length >= maxSelections &&
                        !isSelected,
                    )

                    return (
                      <CommandItem
                        key={option.value}
                        onSelect={() => {
                          if (!isDisabled) {
                            handleToggle(option.value)
                          }
                        }}
                        disabled={isDisabled}
                        className="cursor-pointer"
                      >
                        <Checkbox

                          checked={isSelected}
                          onCheckedChange={() => {
                            if (!isDisabled) {
                              handleToggle(option.value)
                            }
                          }}
                          disabled={isDisabled}
                          className="mr-2"
                        />
                        <span>{option.value}</span>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )
    } else {
      // Use comma-separated input for free-form
      const commaSeparatedValue = Array.isArray(displayValue)
        ? displayValue.join(', ')
        : ''
      return (
        <Input
          value={commaSeparatedValue}
          onChange={(e) => {
            const newValues = e.target.value
              .split(',')
              .map((v) => v.trim())
              .filter((v) => v.length > 0)
            onChange(JSON.stringify(newValues))
          }}
          onBlur={onBlur}
          onFocus={onFocus}
          className="h-full w-full border-none bg-transparent focus-visible:border-none focus-visible:ring-0 shadow-none px-2 py-1 text-sm"
          placeholder="Comma-separated values"
        />
      )
    }
  },
}

const DATE_TYPE: OutputTypeDefinition = {
  id: 'date',
  label: '📅 Date - Date values',
  icon: CalendarIcon,
  tooltip: 'Date',
  description: 'Date values with formatted display',

  configSchema: dateConfigSchema,

  createAISchema: (config) => {
    const dateConfig = config as DateConfig | null
    const dateFormat = dateConfig?.dateFormat || 'YYYY-MM-DD'
    return z.object({
      value: z
        .string()
        .describe(
          `A date in ${dateFormat} format. Analyze the context and return an appropriate date.`,
        ),
    })
  },

  serializeAiResponse: (response) => response.value || '',

  deserialize: (value) => value || '',

  renderEditable: ({ value, config, onChange, onBlur, onFocus }) => {
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
  },
}

// ============================================================================
// Registry
// ============================================================================

// Use satisfies to ensure all output types are handled
export const OUTPUT_TYPE_REGISTRY = {
  text: TEXT_TYPE,
  long_text: LONG_TEXT_TYPE,
  single_select: SINGLE_SELECT_TYPE,
  multi_select: MULTI_SELECT_TYPE,
  date: DATE_TYPE,
} satisfies Record<OutputType, OutputTypeDefinition>

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get output type definition from registry
 */
export function getOutputTypeDefinition(
  type: OutputType,
): OutputTypeDefinition {
  return OUTPUT_TYPE_REGISTRY[type]
}

/**
 * Get all output types for dropdown options
 */
export function getAllOutputTypes(): Array<{
  value: OutputType
  label: string
}> {
  return Object.values(OUTPUT_TYPE_REGISTRY).map((def) => ({
    value: def.id,
    label: def.label,
  }))
}

/**
 * Validate outputTypeConfig against the schema for a given output type
 */
export function validateOutputTypeConfig(
  outputType: OutputType,
  config: unknown,
): { success: boolean; error?: string } {
  try {
    const outputTypeDef = getOutputTypeDefinition(outputType)
    outputTypeDef.configSchema.parse(config)
    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues.map((e) => e.message).join(', '),
      }
    }
    return { success: false, error: 'Invalid configuration' }
  }
}
