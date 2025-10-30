import { createFileRoute } from '@tanstack/react-router'
import { createProtectedHandler } from '@/auth/protected-handler'
import { db } from '@/db'
import {
  aiConversations,
  aiMessages,
  aiTables,
  aiTableColumns,
  aiTableRecords,
  aiTableCells,
} from '@/db/schema'
import { eq, sql } from 'drizzle-orm'
import {
  convertToModelMessages,
  streamText,
  tool,
  stepCountIs,
  type UIMessage,
} from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { getTracer } from '@lmnr-ai/lmnr'

// Define createColumn tool (only available for table conversations)
const createColumnToolSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255)
    .describe('Column name - should be descriptive and concise'),
  type: z
    .enum(['manual', 'ai'])
    .describe(
      'Column type: "manual" for user-entered data, "ai" for AI-generated values based on other columns',
    ),
  description: z
    .string()
    .optional()
    .describe(
      'Optional description explaining what this column contains or how it works',
    ),
  outputType: z
    .enum(['text', 'long_text', 'single_select', 'multi_select', 'date'])
    .describe(
      'Output format: text (short text), long_text (paragraphs), single_select (one option from list), multi_select (multiple options), date (date values)',
    ),
  aiPrompt: z
    .string()
    .optional()
    .describe(
      'For AI columns: The prompt that tells the AI how to generate values. Should reference other columns by name. Required if type is "ai".',
    ),
  outputTypeConfig: z
    .object({
      options: z
        .array(z.object({ value: z.string() }))
        .optional()
        .describe(
          'For select types: array of possible options like [{value: "High"}, {value: "Medium"}, {value: "Low"}]',
        ),
      maxSelections: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('For multi_select: maximum number of selections allowed'),
      dateFormat: z
        .string()
        .optional()
        .describe('For date type: format string like "YYYY-MM-DD"'),
    })
    .optional(),
})

const RequestSchema = z.object({
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(['user', 'assistant', 'system']),
      parts: z.any(),
      metadata: z.any().optional(),
    }),
  ),
})

export const Route = createFileRoute('/api/_authed-api/chat/$conversationId')({
  server: {
    handlers: {
      POST: createProtectedHandler(async ({ user, request, params }) => {
        const conversationId = params.conversationId

        // Parse request body
        const body = await request.json()
        const parseResult = RequestSchema.safeParse(body)

        if (!parseResult.success) {
          return new Response('Invalid request body', { status: 400 })
        }

        const { messages } = parseResult.data

        // Validate existing conversation
        const conversation = await db.query.aiConversations.findFirst({
          where: eq(aiConversations.id, conversationId),
        })

        if (!conversation) {
          return new Response('Conversation not found', { status: 404 })
        }

        if (conversation.userId !== user.id) {
          return new Response('You do not have access to this conversation', {
            status: 403,
          })
        }

        if (conversation.status === 'generating') {
          return new Response('Conversation is already generating a response', {
            status: 409,
          })
        }

        // Set status to generating
        await db
          .update(aiConversations)
          .set({ status: 'generating' })
          .where(eq(aiConversations.id, conversationId))

        // Convert input messages to UIMessage format
        const uiMessages: UIMessage[] = messages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          parts: msg.parts,
          metadata: msg.metadata,
        }))

        // Get table context if this is a table conversation
        const tableId =
          conversation.contextType === 'table' ? conversation.contextId : null

        // Fetch table and columns for context (if available)
        let tableContext = ''
        if (tableId) {
          const table = await db.query.aiTables.findFirst({
            where: eq(aiTables.id, tableId),
            with: {
              columns: {
                orderBy: (columns, { asc }) => [asc(columns.position)],
              },
            },
          })

          if (table) {
            tableContext = `\n\nCurrent table context:\nTable name: ${table.name}\nExisting columns:\n${table.columns.map((col) => `- ${col.name} (${col.type}, ${col.outputType}${col.aiPrompt ? `, AI prompt: "${col.aiPrompt}"` : ''})`).join('\n')}`
          }
        }

        const createColumnTool = tool({
          description:
            'Create a new column in the AI table with specified name, type, and configuration. Use this when the user asks to add, create, or make a new column.',
          inputSchema: createColumnToolSchema,
          execute: async ({
            name,
            outputType,
            type,
            description,
            aiPrompt,
            outputTypeConfig,
          }) => {
            if (!tableId) {
              return {
                success: false,
                error: 'This conversation is not associated with a table',
              }
            }

            try {
              // Validate: AI columns must have a prompt
              if (type === 'ai' && !aiPrompt) {
                return {
                  success: false,
                  error: 'AI columns require an aiPrompt to generate values',
                }
              }

              const newColumn = await db.transaction(async (tx) => {
                // Get current max position
                const maxPosition = await tx
                  .select({
                    max: sql<number>`COALESCE(MAX(position), -1)::int`,
                  })
                  .from(aiTableColumns)
                  .where(eq(aiTableColumns.tableId, tableId))
                  .then((rows) => rows[0]?.max ?? -1)

                // Create column
                const [column] = await tx
                  .insert(aiTableColumns)
                  .values({
                    tableId: tableId,
                    name,
                    type,
                    description: description || '',
                    outputType,
                    aiPrompt: aiPrompt || '',
                    outputTypeConfig: outputTypeConfig ?? null,
                    position: maxPosition + 1,
                  })
                  .returning()

                // Get all existing records
                const records = await tx.query.aiTableRecords.findMany({
                  where: eq(aiTableRecords.tableId, tableId),
                })

                // Create cells for all existing records
                if (records.length > 0) {
                  const cellsToInsert = records.map((record) => ({
                    recordId: record.id,
                    columnId: column.id,
                    value: '',
                  }))

                  await tx.insert(aiTableCells).values(cellsToInsert)
                }

                return column
              })

              return {
                success: true,
                columnId: newColumn.id,
                columnName: newColumn.name,
                message: `Successfully created column "${name}"${type === 'ai' ? ' with AI generation' : ''}`,
              }
            } catch (error) {
              return {
                success: false,
                error:
                  error instanceof Error
                    ? error.message
                    : 'Failed to create column',
              }
            }
          },
        })

        // Build system prompt
        const systemPrompt = `You are an AI assistant helping users manage their data tables.${tableContext}

When users ask to create, add, or make new columns, use the createColumn tool to add them to the table.

Guidelines for creating columns:
- For sentiment analysis, scoring, or categorization: Use "ai" type with "single_select" output type and provide appropriate options
- For calculations or analysis referencing other data: Use "ai" type with "text" or "long_text"
- For dates or deadlines: Use "date" output type
- For categories with predefined options: Use "single_select" with options in outputTypeConfig
- For user-entered data: Use "manual" type
- Always provide a clear, descriptive column name
- For AI columns, write clear prompts that explain what to generate and reference relevant columns

Be helpful in inferring the right column configuration based on user intent. If the request is unclear, make reasonable assumptions and explain your choices.

You can use createColumn tool multiple times to create multiple columns.
`

        // Generate AI response with streaming (agent mode with looping)
        
        const result = streamText({
          model: anthropic('claude-3-7-sonnet-latest'),
          messages: convertToModelMessages(uiMessages),
          ...(tableId && {
            tools: {
              createColumn: createColumnTool,
            },
          }),
          // stopWhen: (params) => {
          //   console.log(params.steps[0].content[0].type);
          //   return params.steps[0].toolCalls.length === 0;
          // },
          stopWhen: stepCountIs(1),

          system: systemPrompt,
          experimental_telemetry: {
            isEnabled: true,
            tracer: getTracer(),
          },
        })

        // Return streaming response
        const response = result.toUIMessageStreamResponse({
          originalMessages: uiMessages,
          onFinish: async ({ messages: newMessages }) => {
            // Wrap in transaction, use bulk insert
            try {
              await db.transaction(async (trx) => {
                // Delete all existing messages
                await trx
                  .delete(aiMessages)
                  .where(eq(aiMessages.conversationId, conversationId))

                // Insert all new messages to database in bulk
                if (newMessages.length > 0) {
                  await trx.insert(aiMessages).values(
                    newMessages.map((msg) => {
                      let id: string | null = msg.id
                      if (!id || id === '') {
                        id = null
                      }
                      return {
                        id: id ?? undefined,
                        conversationId,
                        role: msg.role,
                        parts: msg.parts as any,
                        metadata: msg.metadata || null,
                      }
                    }),
                  )
                }
              })
            } finally {
              // Set status back to idle
              await db
                .update(aiConversations)
                .set({ status: 'idle' })
                .where(eq(aiConversations.id, conversationId))
            }
          },
        })

        return response
      }),
    },
  },
})
