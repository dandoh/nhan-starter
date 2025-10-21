import { z } from 'zod'

// ============================================================================
// Output Type Enums
// ============================================================================

export const OUTPUT_TYPES = [
  'text',
  'long_text',
  'single_select',
  'multi_select',
  'date',
] as const

export type OutputType = (typeof OUTPUT_TYPES)[number]

// ============================================================================
// Zod Schemas for Config Validation
// ============================================================================

export const optionSchema = z.object({
  value: z.string().min(1, 'Option value cannot be empty'),
  color: z.string().optional(),
})

export const textConfigSchema = z.object({
  aiPrompt: z.string().optional(),
})

export const longTextConfigSchema = z.object({
  aiPrompt: z.string().optional(),
})

export const singleSelectConfigSchema = z.object({
  aiPrompt: z.string().optional(),
  options: z.array(optionSchema).optional(),
})

export const multiSelectConfigSchema = z.object({
  aiPrompt: z.string().optional(),
  options: z.array(optionSchema).optional(),
  maxSelections: z.number().int().positive().optional(),
})

export const dateConfigSchema = z.object({
  aiPrompt: z.string().optional(),
  dateFormat: z.string().optional(),
})

// ============================================================================
// Inferred TypeScript Types from Zod Schemas
// ============================================================================

export type OptionConfig = z.infer<typeof optionSchema>
export type TextConfig = z.infer<typeof textConfigSchema>
export type LongTextConfig = z.infer<typeof longTextConfigSchema>
export type SingleSelectConfig = z.infer<typeof singleSelectConfigSchema>
export type MultiSelectConfig = z.infer<typeof multiSelectConfigSchema>
export type DateConfig = z.infer<typeof dateConfigSchema>

export type OutputTypeConfig =
  | TextConfig
  | LongTextConfig
  | SingleSelectConfig
  | MultiSelectConfig
  | DateConfig

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the appropriate config schema for an output type
 */
export function getConfigSchema(outputType: OutputType): z.ZodSchema {
  switch (outputType) {
    case 'text':
      return textConfigSchema
    case 'long_text':
      return longTextConfigSchema
    case 'single_select':
      return singleSelectConfigSchema
    case 'multi_select':
      return multiSelectConfigSchema
    case 'date':
      return dateConfigSchema
    default:
      return textConfigSchema
  }
}

/**
 * Validate config matches the output type
 */
export function validateConfig(
  outputType: OutputType,
  config: unknown,
): { success: boolean; error?: string } {
  try {
    const schema = getConfigSchema(outputType)
    schema.parse(config)
    return { success: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues.map((e: z.ZodIssue) => e.message).join(', '),
      }
    }
    return { success: false, error: 'Invalid configuration' }
  }
}

