import { inngest } from '../client'
import { db } from '@/db'
import { aiTableCells, aiTableColumns } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'

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

    const aiPrompt = (cell.column.config as { aiPrompt?: string })?.aiPrompt
    if (!aiPrompt) {
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

    // Build prompt
    let contextString = `Column: ${cell.column.name}\nPrompt: ${aiPrompt}\n\nRow data:\n`
    for (const [key, value] of Object.entries(rowContext)) {
      contextString += `${key}: ${value}\n`
    }

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

    // Step 2: Generate AI value (expensive operation)
    const aiResult = await step.run('generate-ai-value', async () => {
      const response = await generateText({
        model: anthropic('claude-3-5-sonnet-20241022'),
        prompt: contextString,
      })
      return response.text.trim()
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
