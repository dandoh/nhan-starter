import React from 'react'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { Calendar } from 'lucide-react'
import { format, parse, isValid } from 'date-fns'
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
import { getBadgeColors } from './formatters'

// ============================================================================
// Type Definitions
// ============================================================================

export interface CellRenderProps {
  value: any
  config?: OutputTypeConfig | null
}

export interface OutputTypeDefinition {
  id: OutputType
  label: string
  icon: string
  description: string

  // Config validation schema
  configSchema: z.ZodObject<any>

  // Schema generation for AI
  createAISchema: (config: OutputTypeConfig | null) => z.ZodObject<any>

  // Value conversion
  serialize: (aiResponse: any) => string // AI response → storage
  deserialize: (stored: string | null) => any // storage → display value

  // React rendering
  renderCell: (props: CellRenderProps) => React.ReactNode
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
  icon: '📝',
  description: 'A brief single-line text response',

  configSchema: textConfigSchema,

  createAISchema: () =>
    z.object({
      value: z.string().describe('A brief single-line text response'),
    }),

  serialize: (response) => response.value || '',

  deserialize: (value) => value || '',

  renderCell: ({ value }) => (
    <div className="text-sm overflow-hidden text-ellipsis">
      {value || <span className="text-muted-foreground"></span>}
    </div>
  ),
}

const LONG_TEXT_TYPE: OutputTypeDefinition = {
  id: 'long_text',
  label: '📄 Long Text - Multi-paragraph text',
  icon: '📄',
  description: 'A detailed multi-paragraph text response',

  configSchema: longTextConfigSchema,

  createAISchema: () =>
    z.object({
      value: z
        .string()
        .describe('A detailed multi-paragraph text response'),
    }),

  serialize: (response) => response.value || '',

  deserialize: (value) => value || '',

  renderCell: ({ value }) => {
    if (!value) {
      return <div className="text-sm text-muted-foreground"></div>
    }

    return (
      <div className="text-sm max-h-32 overflow-y-auto whitespace-pre-wrap scrollbar scrollbar-track-transparent hover:scrollbar-thumb-gray-300">
        {value}
      </div>
    )
  },
}

const SINGLE_SELECT_TYPE: OutputTypeDefinition = {
  id: 'single_select',
  label: '🏷️ Single Select - One choice from options',
  icon: '🏷️',
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

  serialize: (response) => response.value || '',

  deserialize: (value) => value || '',

  renderCell: ({ value }) => {
    if (!value) {
      return <div className="text-sm text-muted-foreground"></div>
    }

    const colors = getBadgeColors(value)
    return (
      <div className="">
        <Badge
          style={{
            backgroundColor: colors.backgroundColor,
            color: colors.textColor,
            borderColor: colors.borderColor,
          }}
        >
          {value}
        </Badge>
      </div>
    )
  },
}

const MULTI_SELECT_TYPE: OutputTypeDefinition = {
  id: 'multi_select',
  label: '🏷️ Multi Select - Multiple choices',
  icon: '🏷️',
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

  serialize: (response) => {
    const values = response.values || []
    return JSON.stringify(values)
  },

  deserialize: (value) => parseMultiSelectValue(value),

  renderCell: ({ value }) => {
    const values = Array.isArray(value) ? value : []

    if (values.length === 0) {
      return <div className="text-sm text-muted-foreground"></div>
    }

    return (
      <div className="flex flex-wrap gap-1">
        {values.map((val, index) => {
          const colors = getBadgeColors(val)
          return (
            <Badge
              key={index}
              style={{
                backgroundColor: colors.backgroundColor,
                color: colors.textColor,
                borderColor: colors.borderColor,
              }}
            >
              {val}
            </Badge>
          )
        })}
      </div>
    )
  },
}

const DATE_TYPE: OutputTypeDefinition = {
  id: 'date',
  label: '📅 Date - Date values',
  icon: '📅',
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

  serialize: (response) => response.value || '',

  deserialize: (value) => value || '',

  renderCell: ({ value, config }) => {
    if (!value) {
      return <div className="text-sm text-muted-foreground"></div>
    }

    const dateConfig = config as DateConfig | null
    const displayValue = formatDateValue(value, dateConfig?.dateFormat)

    return (
      <div className="flex items-center gap-2 text-sm">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
        <span>{displayValue}</span>
      </div>
    )
  },
}

// ============================================================================
// Registry
// ============================================================================

export const OUTPUT_TYPE_REGISTRY: Record<OutputType, OutputTypeDefinition> = {
  text: TEXT_TYPE,
  long_text: LONG_TEXT_TYPE,
  single_select: SINGLE_SELECT_TYPE,
  multi_select: MULTI_SELECT_TYPE,
  date: DATE_TYPE,
}

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
export function getAllOutputTypes(): Array<{ value: OutputType; label: string }> {
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

