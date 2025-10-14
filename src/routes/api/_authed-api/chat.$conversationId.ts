import { createFileRoute } from '@tanstack/react-router'
import { createProtectedHandler } from '@/auth/protected-handler'
import { db } from '@/db'
import { aiConversations, aiMessages } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { convertToModelMessages, streamText, type UIMessage } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'

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

        // Generate AI response with streaming
        const result = streamText({
          model: anthropic('claude-3-5-sonnet-latest'),
          messages: convertToModelMessages(uiMessages),
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
