import { inngest } from '../client'
import { db } from '@/db'
import { aiTableCells, aiTableColumns } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { anthropic } from '@ai-sdk/anthropic'
import { generateObject } from 'ai'
import { z } from 'zod'
import type { OutputType } from '@/lib/ai-table/output-types'

/**
 * Generate a Zod schema based on the output type and config
 */
function generateResponseSchema(
  outputType: OutputType,
  config: any,
): z.ZodObject<any> {
  switch (outputType) {
    case 'text':
      return z.object({
        value: z.string().describe('A brief single-line text response'),
      })

    case 'long_text':
      return z.object({
        value: z
          .string()
          .describe('A detailed multi-paragraph text response'),
      })

    case 'single_select': {
      const options = config?.options as Array<{ value: string }> | undefined
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
    }

    case 'multi_select': {
      const options = config?.options as Array<{ value: string }> | undefined
      const maxSelections = config?.maxSelections as number | undefined

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
    }

    case 'date': {
      const dateFormat = (config?.dateFormat as string) || 'YYYY-MM-DD'
      return z.object({
        value: z
          .string()
          .describe(
            `A date in ${dateFormat} format. Analyze the context and return an appropriate date.`,
          ),
      })
    }

    default:
      // Fallback to text
      return z.object({
        value: z.string().describe('A text response'),
      })
  }
}

/**
 * Format the AI response based on output type for storage
 */
function formatResponseValue(
  outputType: OutputType,
  responseObject: any,
): string {
  if (outputType === 'multi_select') {
    // Store array as JSON string
    const values = responseObject.values || []
    return JSON.stringify(values)
  } else {
    // All other types store the value directly
    return responseObject.value || ''
  }
}

/**
 * Compute a single AI cell value using Claude
 * Concurrency limited to 5 cells at a time
 */
export const computeAiCell = inngest.createFunction(
  {
    id: 'compute-ai-cell',
    concurrency: {
      limit: 5,
    },
    retries: 0,
    onFailure: async ({ error, event }) => {
      // Handle any failure in the workflow by marking cell as error
      // Note: In onFailure, event.data.event contains the original trigger event
      const cellId = event.data.event.data.cellId
      await db
        .update(aiTableCells)
        .set({
          computeStatus: 'error',
          computeError: error.message,
          updatedAt: new Date(),
        })
        .where(eq(aiTableCells.id, cellId))
    },
  },
  { event: 'ai/cell.compute' },
  async ({ event, step }) => {
    const { cellId } = event.data

    // Fetch cell with related data (no step - fast and idempotent)
    const cell = await db.query.aiTableCells.findFirst({
      where: eq(aiTableCells.id, cellId),
      with: {
        column: true,
        record: {
          with: {
            table: true,
          },
        },
      },
    })

    if (!cell) {
      throw new Error(`Cell ${cellId} not found`)
    }

    if (cell.column.type !== 'ai') {
      throw new Error(`Cell ${cellId} is not an AI column`)
    }

    const aiPrompt = cell.column.aiPrompt
    if (!aiPrompt || aiPrompt.trim() === '') {
      throw new Error('AI column has no prompt configured')
    }

    // Fetch manual column values from same row (no step - fast reads)
    const manualColumns = await db.query.aiTableColumns.findMany({
      where: and(
        eq(aiTableColumns.tableId, cell.record.tableId),
        eq(aiTableColumns.type, 'manual'),
      ),
    })

    const manualCells =
      manualColumns.length > 0
        ? await db.query.aiTableCells.findMany({
            where: eq(aiTableCells.recordId, cell.recordId),
          })
        : []

    // Build context from manual columns
    const manualColumnIds = new Set(manualColumns.map((col) => col.id))
    const rowContext: Record<string, string> = {}

    for (const cellItem of manualCells) {
      if (manualColumnIds.has(cellItem.columnId)) {
        const column = manualColumns.find((col) => col.id === cellItem.columnId)
        if (column && cellItem.value) {
          rowContext[column.name] = cellItem.value
        }
      }
    }

    // Build context string for prompt
    let contextString = `Column: ${cell.column.name}\n\n`

    // Add row context
    if (Object.keys(rowContext).length > 0) {
      contextString += 'Row data:\n'
      for (const [key, value] of Object.entries(rowContext)) {
        contextString += `- ${key}: ${value}\n`
      }
      contextString += '\n'
    }

    // Add the AI prompt
    contextString += `Task: ${aiPrompt}`

    // Generate response schema based on output type
    const outputType = cell.column.outputType as OutputType
    const outputTypeConfig = cell.column.outputTypeConfig
    const responseSchema = generateResponseSchema(outputType, outputTypeConfig)

    // Step 1: Set status to computing
    await step.run('set-computing-status', async () => {
      await db
        .update(aiTableCells)
        .set({
          computeStatus: 'computing',
          updatedAt: new Date(),
        })
        .where(eq(aiTableCells.id, cellId))
    })

    // Step 2: Generate AI value with structured output (expensive operation)
    const aiResult = await step.run('generate-ai-value', async () => {
      try {
        const response = await generateObject({
          model: anthropic('claude-3-5-sonnet-20241022'),
          schema: responseSchema,
          prompt: contextString,
        })

        // Format the response for storage
        const formattedValue = formatResponseValue(outputType, response.object)
        return formattedValue
      } catch (error: any) {
        // If AI fails to follow schema, throw descriptive error
        throw new Error(
          `AI failed to generate valid ${outputType}: ${error.message}`,
        )
      }
    })

    // Step 3: Update cell with success
    await step.run('update-cell-success', async () => {
      await db
        .update(aiTableCells)
        .set({
          value: aiResult,
          computeStatus: 'completed',
          computeError: null,
          updatedAt: new Date(),
        })
        .where(eq(aiTableCells.id, cellId))
    })

    return { success: true, value: aiResult }
  },
)
