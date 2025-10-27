import { inngest } from '../client'
import { db } from '@/db'
import { aiTableCells, aiTableColumns } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
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
          model: anthropic('claude-3-5-sonnet-20241022'),
          schema: responseSchema,
          prompt: contextString,
          experimental_telemetry: {
            isEnabled: true,
            tracer: getTracer(),
          },
        })

        // Serialize the response for storage using registry
        const formattedValue = outputTypeDef.serialize(response.object)
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
