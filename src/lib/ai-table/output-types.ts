import { z } from 'zod'
import {
  AI_TABLE_OUTPUT_TYPES,
  type AiTableOutputType,
} from '@/db/schema'

// ============================================================================
// Output Type Enums
// ============================================================================

// Re-export from schema.ts as the single source of truth
export const OUTPUT_TYPES = AI_TABLE_OUTPUT_TYPES
export type OutputType = AiTableOutputType

// ============================================================================
// Zod Schemas for Config Validation
// ============================================================================

export const optionSchema = z.object({
  value: z.string().min(1, 'Option value cannot be empty'),
  color: z.string().optional(),
})

export const textConfigSchema = z.object({})

export const longTextConfigSchema = z.object({})

export const singleSelectConfigSchema = z.object({
  options: z.array(optionSchema).optional(),
})

export const multiSelectConfigSchema = z.object({
  options: z.array(optionSchema).optional(),
  maxSelections: z.number().int().positive().optional(),
})

export const dateConfigSchema = z.object({
  dateFormat: z.string().optional(),
})

/**
 * File column configuration schema.
 * File value structure:
 * {
 *   bucket: string      // S3 bucket name
 *   key: string         // S3 object key
 *   filename: string    // Original filename
 *   extension: string   // File extension
 *   fileSize: number    // Size in bytes
 *   mimeType: string    // MIME type (e.g., 'image/png')
 *   md5Hash?: string    // Optional MD5 hash for deduplication
 * }
 */
export const fileConfigSchema = z.object({})

/**
 * File value schema for validation
 */
export const fileValueSchema = z.object({
  bucket: z.string(),
  key: z.string(),
  filename: z.string(),
  extension: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
  md5Hash: z.string().optional(),
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
export type FileConfig = z.infer<typeof fileConfigSchema>

export type OutputTypeConfig =
  | TextConfig
  | LongTextConfig
  | SingleSelectConfig
  | MultiSelectConfig
  | DateConfig
  | FileConfig

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
    case 'file':
      return fileConfigSchema
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

