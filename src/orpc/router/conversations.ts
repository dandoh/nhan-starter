import { os } from '@orpc/server'
import * as z from 'zod'
import { authMiddleware } from '../middleware/auth'
import { db } from '@/db'
import {
  aiConversations,
  aiMessages,
  aiTables,
  workbooks,
  conversationContextToFields,
  conversationContextSchema,
} from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

/**
 * Create a new conversation
 * - Requires authentication
 * - Optionally accepts context (table, workbook) to scope the conversation
 * - Optionally accepts an initial prompt which will be saved as the first user message
 * - Returns new conversation object
 */
export const createConversation = os
  .use(authMiddleware)
  .input(
    z.object({
      title: z.string().optional().describe('The title of the conversation'),
      initialPrompt: z.string().optional().describe('The initial prompt for the conversation'),
      context: conversationContextSchema.optional().describe('The context of the conversation'),
    }),
  )
  .handler(async ({ input, context }) => {
    // Validate context if provided
    if (input.context) {
      if (input.context.type === 'table') {
        // Verify table exists and user has access
        const table = await db.query.aiTables.findFirst({
          where: and(
            eq(aiTables.id, input.context.tableId),
            eq(aiTables.userId, context.user.id),
          ),
        })
        if (!table) {
          throw new Error('Table not found or access denied')
        }
      }
      if (input.context.type === 'workbook') {
        // Verify workbook exists and user has access
        const workbook = await db.query.workbooks.findFirst({
          where: and(
            eq(workbooks.id, input.context.workbookId),
            eq(workbooks.userId, context.user.id),
          ),
        })
        if (!workbook) {
          throw new Error('Workbook not found or access denied')
        }
      }
    }

    // Convert context to database fields
    const contextFields = input.context
      ? conversationContextToFields(input.context)
      : { contextType: 'general' as const, contextId: null }

    const [newConversation] = await db
      .insert(aiConversations)
      .values({
        userId: context.user.id,
        status: 'idle',
        title: input.title || null,
        contextType: contextFields.contextType,
        contextId: contextFields.contextId,
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
  .handler(async ({ input, context }) => {
    const { conversationId } = input

    // Validate existing conversation
    const conversation = await db.query.aiConversations.findFirst({
      where: eq(aiConversations.id, conversationId),
      with: {
        messages: {
          orderBy: (m, { asc }) => [asc(m.createdAt)],
        },
      },
    })

    if (!conversation) {
      throw new Error('Conversation not found')
    }

    if (conversation.userId !== context.user.id) {
      throw new Error('You do not have access to this conversation')
    }

    return conversation
  })

/**
 * Find or create a conversation for a specific context
 * - Useful for table/workbook chat where we want one conversation per context
 * - Returns existing conversation if found, creates new one if not
 */
export const findOrCreateConversationForContext = os
  .use(authMiddleware)
  .input(
    z.object({
      context: conversationContextSchema,
      title: z.string().optional(),
    }),
  )
  .handler(async ({ input, context }) => {
    // Validate context access
    if (input.context.type === 'table') {
      const table = await db.query.aiTables.findFirst({
        where: and(
          eq(aiTables.id, input.context.tableId),
          eq(aiTables.userId, context.user.id),
        ),
      })
      if (!table) {
        throw new Error('Table not found or access denied')
      }
    }
    if (input.context.type === 'workbook') {
      const workbook = await db.query.workbooks.findFirst({
        where: and(
          eq(workbooks.id, input.context.workbookId),
          eq(workbooks.userId, context.user.id),
        ),
      })
      if (!workbook) {
        throw new Error('Workbook not found or access denied')
      }
    }

    // Convert context to fields
    const contextFields = conversationContextToFields(input.context)

    // Try to find existing conversation for this context
    const existing = await db.query.aiConversations.findFirst({
      where: and(
        eq(aiConversations.userId, context.user.id),
        eq(aiConversations.contextType, contextFields.contextType),
        contextFields.contextId
          ? eq(aiConversations.contextId, contextFields.contextId)
          : isNull(aiConversations.contextId),
      ),
      with: {
        messages: {
          orderBy: (m, { asc }) => [asc(m.createdAt)],
        },
      },
    })

    if (existing) {
      return existing
    }

    // Create new conversation
    const [newConversation] = await db
      .insert(aiConversations)
      .values({
        userId: context.user.id,
        status: 'idle',
        title: input.title || null,
        contextType: contextFields.contextType,
        contextId: contextFields.contextId,
      })
      .returning()

    return {
      ...newConversation,
      messages: [],
    } as any
  })

/**
 * Get conversations for a specific context
 * - Returns last 10 conversations for the given context
 * - Creates a new conversation if none exist
 * - Optimized for React Query / Suspense usage
 */
export const getConversationsForContext = os
  .use(authMiddleware)
  .input(
    z.object({
      context: conversationContextSchema,
      limit: z.number().min(1).max(50).default(10),
    }),
  )
  .handler(async ({ input, context }) => {
    // Validate context access
    if (input.context.type === 'table') {
      const table = await db.query.aiTables.findFirst({
        where: and(
          eq(aiTables.id, input.context.tableId),
          eq(aiTables.userId, context.user.id),
        ),
      })
      if (!table) {
        throw new Error('Table not found or access denied')
      }
    }
    if (input.context.type === 'workbook') {
      const workbook = await db.query.workbooks.findFirst({
        where: and(
          eq(workbooks.id, input.context.workbookId),
          eq(workbooks.userId, context.user.id),
        ),
      })
      if (!workbook) {
        throw new Error('Workbook not found or access denied')
      }
    }

    // Convert context to fields
    const contextFields = conversationContextToFields(input.context)

    // Fetch existing conversations for this context
    const conversations = await db.query.aiConversations.findMany({
      where: and(
        eq(aiConversations.userId, context.user.id),
        eq(aiConversations.contextType, contextFields.contextType),
        contextFields.contextId
          ? eq(aiConversations.contextId, contextFields.contextId)
          : isNull(aiConversations.contextId),
      ),
      with: {
        messages: {
          orderBy: (m, { asc }) => [asc(m.createdAt)],
        },
      },
      orderBy: (c, { desc }) => [desc(c.createdAt)],
      limit: input.limit,
    })

    // If no conversations exist, create one
    if (conversations.length === 0) {
      const [newConversation] = await db
        .insert(aiConversations)
        .values({
          userId: context.user.id,
          status: 'idle',
          title: null,
          contextType: contextFields.contextType,
          contextId: contextFields.contextId,
        })
        .returning()

      return [
        {
          ...newConversation,
          messages: [],
        },
      ]
    }

    return conversations
  })

