import { createFileRoute } from '@tanstack/react-router'
import { createProtectedHandler } from '@/auth/protected-handler'
import { db } from '@/db'
import {
  aiConversations,
  aiMessages,
  aiTables,
  workbooks,
} from '@/db/schema'
import { eq } from 'drizzle-orm'
import {
  ToolLoopAgent,
  createAgentUIStreamResponse,
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

/**
 * Get context information for a conversation based on its context type and ID
 * @returns Object with contextString (formatted for AI) and availableTableIds
 */
async function getConversationContext(
  contextType: string | null,
  contextId: string | null,
): Promise<{
  contextString: string
  availableTableIds: string[]
}> {
  let contextString = ''
  let availableTableIds: string[] = []

  if (contextType === 'table' && contextId) {
    // Single table context
    const table = await db.query.aiTables.findFirst({
      where: eq(aiTables.id, contextId),
      with: {
        columns: {
          orderBy: (columns, { asc }) => [asc(columns.createdAt)],
        },
      },
    })

    if (table) {
      availableTableIds = [table.id]
      contextString = `
<context type="table">
<table id="${table.id}">
${JSON.stringify(table, null, 2)}
</table>
</context>
      `
    }
  } else if (contextType === 'workbook' && contextId) {
    // Workbook context - fetch all tables within the workbook
    const workbook = await db.query.workbooks.findFirst({
      where: eq(workbooks.id, contextId),
      with: {
        blocks: {
          with: {
            table: {
              with: {
                columns: {
                  orderBy: (columns, { asc }) => [asc(columns.createdAt)],
                },
              },
            },
          },
        },
      },
    })

    if (workbook) {
      // Extract all tables from workbook blocks
      const tables = workbook.blocks
        .filter((block) => block.table !== null)
        .map((block) => block.table)

      availableTableIds = tables.map((t) => t!.id)

      const tablesContext = tables
        .map(
          (table) => `
<table id="${table!.id}">
${JSON.stringify(table, null, 2)}
</table>`,
        )
        .join('\n')

      contextString = `
<context type="workbook">
<workbook id="${workbook.id}" name="${workbook.name}">
${tablesContext}
</workbook>
</context>
      `
    }
  }

  return { contextString, availableTableIds }
}

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

        // Get context information
        const { contextString, availableTableIds } =
          await getConversationContext(
            conversation.contextType,
            conversation.contextId,
          )

        // Convert input messages to UIMessage format
        const uiMessages: UIMessage[] = messages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          parts: msg.parts,
          metadata: msg.metadata,
        }))

        // Build additional instructions message (if there's any context)
        let additionalInstructions = ''
        
        if (availableTableIds.length > 0) {
          additionalInstructions = `Available table IDs for operations: ${availableTableIds.join(', ')}

When working with tables:
- Use the createColumn tool to add new columns with specific output types and AI prompts
- Use the updateColumn tool to modify existing column properties
- Reference columns by their names when creating AI prompts
- Suggest useful columns that can enrich the data`
        }

        // Add context and instructions as system messages if available
        const systemMessages: UIMessage[] = []
        
        if (contextString.trim()) {
          systemMessages.push({
            id: `context-${conversation.id}`,
            role: 'system',
            parts: [
              {
                type: 'text',
                text: contextString,
              },
            ],
          })
        }
        
        if (additionalInstructions.trim()) {
          systemMessages.push({
            id: `instructions-${conversation.id}`,
            role: 'system',
            parts: [
              {
                type: 'text',
                text: additionalInstructions,
              },
            ],
          })
        }

        // Prepend system messages to the conversation
        uiMessages.unshift(...systemMessages)

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

        // Static system prompt - defines the assistant's role only
        const systemPrompt = `You are an AI assistant helping users manage their data tables and workbooks.

You have access to tools to collaborate with the user on modifying tables and integrating with external services.`

        // Create agent with tools
        const agent = new ToolLoopAgent({
          model: anthropic('claude-3-7-sonnet-latest'),
          instructions: systemPrompt,
          tools: {
            ...(availableTableIds.length > 0 && {
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
            const { messages: newMessages } = args
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
