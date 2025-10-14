import { os, ORPCError } from '@orpc/server'
import * as z from 'zod'
import { authMiddleware } from '../middleware/auth'
import { db } from '@/db'
import { aiConversations, aiMessages } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getRequestHeaders } from '@tanstack/react-start/server'

/**
 * Create a new conversation
 * - Requires authentication
 * - Optionally accepts an initial prompt which will be saved as the first user message
 * - Returns new conversation object
 */
export const createConversation = os
  .use(authMiddleware)
  .input(
    z.object({
      title: z.string().optional(),
      initialPrompt: z.string().optional(),
    }),
  )
  .handler(async ({ input, context }) => {
    const [newConversation] = await db
      .insert(aiConversations)
      .values({
        userId: context.user.id,
        status: 'idle',
        title: input.title || null,
      })
      .returning()

    // If initial prompt is provided, create the first user message
    if (input.initialPrompt) {
      await db.insert(aiMessages).values({
        id: crypto.randomUUID(),
        conversationId: newConversation.id,
        role: 'user',
        parts: [{ type: 'text', text: input.initialPrompt }],
        metadata: null,
      })
    }

    return newConversation
  })

/**
 * Get conversation with messages
 * - Requires authentication and validates ownership
 * - Returns conversation details and all messages
 */
export const getConversation = os
  .use(authMiddleware)
  .input(
    z.object({
      conversationId: z.string().uuid(),
    }),
  )
  .output(
    z.object({
      id: z.string().uuid(),
      status: z.enum(['idle', 'generating']),
      title: z.string().nullable(),
      userId: z.string().uuid(),
      messages: z.array(z.any()),
    }),
  )
  .handler(async ({ input, context }) => {
    const { conversationId } = input

    // Validate existing conversation
    const conversation = await db.query.aiConversations.findFirst({
      where: eq(aiConversations.id, conversationId),
      with: {
        messages: {
          orderBy: (messages, { asc }) => [asc(messages.createdAt)],
        },
      },
    })

    if (!conversation) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Conversation not found',
      })
    }

    if (conversation.userId !== context.user.id) {
      throw new ORPCError('FORBIDDEN', {
        message: 'You do not have access to this conversation',
      })
    }

    return conversation
  })
  .callable({
    context: () => ({
      headers: getRequestHeaders(),
    }),
  })
