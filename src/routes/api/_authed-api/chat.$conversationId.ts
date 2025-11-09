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
import { eq } from 'drizzle-orm'
import {
  ToolLoopAgent,
  createAgentUIStreamResponse,
  tool,
  stepCountIs,
  type UIMessage,
} from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { getTracer } from '@lmnr-ai/lmnr'
import { createColumn, updateColumn } from '@/orpc/router/ai-tables'
import { createTool } from '@orpc/ai-sdk'
import { Composio } from '@composio/core'
import { VercelProvider } from '@composio/vercel'

// Define createColumn tool (only available for table conversations)
const createColumnToolSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255)
    .describe('Column name - should be descriptive and concise'),
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
      'Optional: The prompt that tells the AI how to generate values. Should reference other columns by name. If provided, the column will be AI-generated.',
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
                orderBy: (columns, { asc }) => [asc(columns.createdAt)],
              },
            },
          })

          if (table) {
            tableContext = `
<table_context>
${JSON.stringify(table, null, 2)}
</table_context>
            `
          }
        }

        const createColumnTool = createTool(createColumn, {
          description: 'Create a new column in the table',
          context: {
            user,
          },
        })
        const updateColumnTool = createTool(updateColumn, {
          description: 'Update an existing column in the table',
          context: {
            user,
          },
        })
        // const addRowsWithValuesTool = createTool(addRowsWithValues, {
        //   description: 'Add multiple rows to the table, setting the primary column value for each row',
        //   context: {
        //     user,
        //   },
        // })
        const composio = new Composio({
          provider: new VercelProvider(),
        })
        const composioTools = await composio.tools.get(user.id, {
          toolkits: ['LINEAR'],
        })

        // Build system prompt
        const systemPrompt = `You are an AI assistant helping users manage their data tables.
        
${tableContext}

You have access to tools to collaborate with the user on modifying the table.

`

        // Create agent with tools
        const agent = new ToolLoopAgent({
          model: anthropic('claude-3-7-sonnet-latest'),
          instructions: systemPrompt,
          tools: {
            ...(tableId && {
              createColumn: createColumnTool,
              updateColumn: updateColumnTool,
              // addRowsWithValues: addRowsWithValuesTool,
            }),
            ...composioTools,
          },
          stopWhen: stepCountIs(20), // Allow up to 20 steps for tool calls
          experimental_telemetry: {
            isEnabled: true,
            tracer: getTracer(),
          },
        })

        // Return streaming response using the agent
        const response = createAgentUIStreamResponse({
          agent,
          messages: uiMessages,
          onFinish: async (args) => {
            const { messages: newMessages, isAborted, isContinuation } = args
            // Wrap in transaction, use bulk insert
            try {
              await db.transaction(async (trx) => {
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
