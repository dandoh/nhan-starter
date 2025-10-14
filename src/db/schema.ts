import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

// Export auth schema
import { users, sessions, accounts, verifications } from '../auth/auth-schema'

export { users, sessions, accounts, verifications }

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert

export type Account = typeof accounts.$inferSelect
export type NewAccount = typeof accounts.$inferInsert

export type Verification = typeof verifications.$inferSelect
export type NewVerification = typeof verifications.$inferInsert

// Posts table
export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content'),
  published: boolean('published').notNull().default(false),
  authorId: text('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export type Post = typeof posts.$inferSelect
export type NewPost = typeof posts.$inferInsert

// AI Conversations table
export const aiConversations = pgTable('ai_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }),
  status: text('status', { enum: ['idle', 'generating'] })
    .notNull()
    .default('idle'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export type AiConversation = typeof aiConversations.$inferSelect
export type NewAiConversation = typeof aiConversations.$inferInsert

// AI Messages table (follows AI SDK UIMessage format)
export const aiMessages = pgTable('ai_messages', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`), // Message ID from AI SDK
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => aiConversations.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull(), // 'system' | 'user' | 'assistant'
  parts: jsonb('parts').notNull(), // Array of UIMessagePart (text, tool calls, reasoning, files, etc.)
  metadata: jsonb('metadata'), // Optional custom metadata
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type AiMessage = typeof aiMessages.$inferSelect
export type NewAiMessage = typeof aiMessages.$inferInsert

// Relations
export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}))

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  aiConversations: many(aiConversations),
}))

export const aiConversationsRelations = relations(
  aiConversations,
  ({ one, many }) => ({
    user: one(users, {
      fields: [aiConversations.userId],
      references: [users.id],
    }),
    messages: many(aiMessages),
  }),
)

export const aiMessagesRelations = relations(aiMessages, ({ one }) => ({
  conversation: one(aiConversations, {
    fields: [aiMessages.conversationId],
    references: [aiConversations.id],
  }),
}))
