import { inngest } from '../client'
import { db } from '@/db'
import { aiTableCells, aiTableColumns } from '@/db/schema'
import { eq, and, isNull, or } from 'drizzle-orm'
import { anthropic } from '@ai-sdk/anthropic'
import { generateObject } from 'ai'
import { getOutputTypeDefinition } from '@/lib/ai-table/output-type-registry'
import { getTracer } from '@lmnr-ai/lmnr'

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

    const aiPrompt = cell.column.aiPrompt
    if (!aiPrompt || aiPrompt.trim() === '') {
      throw new Error('Column has no AI prompt configured')
    }

    // Fetch other columns from same table for context (columns without AI prompts or empty prompts)
    const contextColumns = await db.query.aiTableColumns.findMany({
      where: and(
        eq(aiTableColumns.tableId, cell.record.tableId),
        or(
          isNull(aiTableColumns.aiPrompt),
          eq(aiTableColumns.aiPrompt, ''),
        ),
      ),
    })

    const contextCells =
      contextColumns.length > 0
        ? await db.query.aiTableCells.findMany({
            where: eq(aiTableCells.recordId, cell.recordId),
          })
        : []

    // Build context from columns without AI prompts
    const contextColumnIds = new Set(contextColumns.map((col) => col.id))
    const rowContext: Record<string, string> = {}

    for (const cellItem of contextCells) {
      if (contextColumnIds.has(cellItem.columnId)) {
        const column = contextColumns.find((col) => col.id === cellItem.columnId)
        if (column && cellItem.value) {
          // Convert JSON value to string for context
          const cellValue = cellItem.value
          if (typeof cellValue === 'object' && cellValue !== null) {
            // Handle object format { value: string } or { values: string[] }
            if ('value' in cellValue && typeof cellValue.value === 'string') {
              rowContext[column.name] = cellValue.value
            } else if ('values' in cellValue && Array.isArray(cellValue.values)) {
              rowContext[column.name] = cellValue.values.join(', ')
            } else {
              rowContext[column.name] = JSON.stringify(cellValue)
            }
          }
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

    // Get output type definition from registry
    const outputType = cell.column.outputType
    const outputTypeConfig = cell.column.outputTypeConfig
    const outputTypeDef = getOutputTypeDefinition(outputType)
    const responseSchema = outputTypeDef.createAISchema(outputTypeConfig)

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
          model: anthropic('claude-sonnet-4-0'),
          schema: responseSchema,
          prompt: contextString,
          system: 'You are a helpful assistant that generates values for AI table cells.',
          experimental_telemetry: {
            isEnabled: true,
            tracer: getTracer(),
          },
        })

        // Store the AI response object directly as JSON
        return response.object
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
