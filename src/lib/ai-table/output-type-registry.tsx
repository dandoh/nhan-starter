import React from 'react'
import { z } from 'zod'
import {
  Type,
  FileText,
  Tag,
  Tags,
  Calendar as CalendarIcon,
} from 'lucide-react'
import type {
  OutputType,
  OutputTypeConfig,
} from './output-types'
import {
  textConfigSchema,
  longTextConfigSchema,
  singleSelectConfigSchema,
  multiSelectConfigSchema,
  dateConfigSchema,
} from './output-types'
import { TextEditableCell } from './editable-cells/TextEditableCell'
import { LongTextEditableCell } from './editable-cells/LongTextEditableCell'
import { SingleSelectEditableCell } from './editable-cells/SingleSelectEditableCell'
import { MultiSelectEditableCell } from './editable-cells/MultiSelectEditableCell'
import { DateEditableCell } from './editable-cells/DateEditableCell'

// ============================================================================
// Type Definitions
// ============================================================================

export interface EditableCellProps<
  T extends OutputTypeConfig,
  ValueType = string,
> {
  value: ValueType
  config?: T | null
  onChange: (value: ValueType) => void
  onBlur?: () => void
  onFocus?: () => void
  isEditing?: boolean
}

export interface OutputTypeDefinition<
  ConfigSchema extends z.ZodObject<any>,
  ValueSchema extends (z.ZodObject<any>),
> {
  id: OutputType
  label: string
  icon: React.ComponentType<{ className?: string }>
  tooltip: string
  description: string

  // Config validation schema
  configSchema: ConfigSchema

  // Schema generation for AI
  createAISchema: (config: z.infer<ConfigSchema> | null) => ValueSchema

  // React rendering - editable version for table cells
  EditableCell: React.ComponentType<
    EditableCellProps<z.infer<ConfigSchema>, z.infer<ValueSchema>>
  >
}

// ============================================================================
// Helper Functions
// ============================================================================

// ============================================================================
// Output Type Definitions
// ============================================================================

const TEXT_TYPE: OutputTypeDefinition<
  typeof textConfigSchema,
  z.ZodObject<{ value: z.ZodString }>
> = {
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

  EditableCell: TextEditableCell,
}

const LONG_TEXT_TYPE: OutputTypeDefinition<
  typeof longTextConfigSchema,
  z.ZodObject<{ value: z.ZodString }>
> = {
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

  EditableCell: LongTextEditableCell,
}

const SINGLE_SELECT_TYPE: OutputTypeDefinition<
  typeof singleSelectConfigSchema,
  z.ZodObject<{ value: z.ZodString | z.ZodEnum<any> }>
> = {
  id: 'single_select',
  label: '🏷️ Single Select - One choice from options',
  icon: Tag,
  tooltip: 'Single choice',
  description: 'AI chooses one value, displayed as a colored badge',

  configSchema: singleSelectConfigSchema,

  createAISchema: (config) => {
    const selectConfig = config
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

  EditableCell: SingleSelectEditableCell,
}

const MULTI_SELECT_TYPE: OutputTypeDefinition<
  typeof multiSelectConfigSchema,
  z.ZodObject<{ values: z.ZodArray<z.ZodString | z.ZodEnum<any>> }>
> = {
  id: 'multi_select',
  label: '🏷️ Multi Select - Multiple choices',
  icon: Tags,
  tooltip: 'Multiselect',
  description: 'AI chooses multiple values, displayed as multiple badges',

  configSchema: multiSelectConfigSchema,

  createAISchema: (config) => {
    const selectConfig = config as
      | import('./output-types').MultiSelectConfig
      | null
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

  EditableCell: MultiSelectEditableCell,
}

const DATE_TYPE: OutputTypeDefinition<
  typeof dateConfigSchema,
  z.ZodObject<{ value: z.ZodString }>
> = {
  id: 'date',
  label: '📅 Date - Date values',
  icon: CalendarIcon,
  tooltip: 'Date',
  description: 'Date values with formatted display',

  configSchema: dateConfigSchema,

  createAISchema: (config) => {
    const dateConfig = config as import('./output-types').DateConfig | null
    const dateFormat = dateConfig?.dateFormat || 'YYYY-MM-DD'
    return z.object({
      value: z
        .string()
        .describe(
          `A date in ${dateFormat} format. Analyze the context and return an appropriate date.`,
        ),
    })
  },

  EditableCell: DateEditableCell,
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
} as const
// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get output type definition from registry
 */
export function getOutputTypeDefinition(
  type: OutputType,
): OutputTypeDefinition<z.ZodObject<any>, z.ZodObject<any>> {
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
