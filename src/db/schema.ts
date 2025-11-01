import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { z } from 'zod'

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
  // Context - allows conversation to be scoped to different entities (table, project, document, etc.)
  contextType: text('context_type', { enum: ['general', 'table', 'project', 'document'] })
    .default('general'),
  contextId: uuid('context_id'), // Nullable UUID - reference to the context entity
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => [
  index('ai_conversations_user_id_idx').on(table.userId),
  index('ai_conversations_context_idx').on(table.contextType, table.contextId),
])

export type AiConversation = typeof aiConversations.$inferSelect
export type NewAiConversation = typeof aiConversations.$inferInsert

// Zod schema for conversation context (single source of truth)
export const conversationContextSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('general') }),
  z.object({ type: z.literal('table'), tableId: z.string().uuid() }),
  z.object({ type: z.literal('project'), projectId: z.string().uuid() }),
  z.object({ type: z.literal('document'), documentId: z.string().uuid() }),
])

// Helper type for conversation context (inferred from schema)
export type ConversationContext = z.infer<typeof conversationContextSchema>

// Helper to create context fields from ConversationContext
export function conversationContextToFields(context: ConversationContext): {
  contextType: 'general' | 'table' | 'project' | 'document'
  contextId: string | null
} {
  if (context.type === 'general') {
    return { contextType: 'general', contextId: null }
  }
  if (context.type === 'table') {
    return { contextType: 'table', contextId: context.tableId }
  }
  if (context.type === 'project') {
    return { contextType: 'project', contextId: context.projectId }
  }
  return { contextType: 'document', contextId: context.documentId }
}

// Helper to parse context fields back to ConversationContext
export function fieldsToConversationContext(
  contextType: string | null,
  contextId: string | null,
): ConversationContext {
  if (contextType === 'table' && contextId) {
    return { type: 'table', tableId: contextId }
  }
  if (contextType === 'project' && contextId) {
    return { type: 'project', projectId: contextId }
  }
  if (contextType === 'document' && contextId) {
    return { type: 'document', documentId: contextId }
  }
  return { type: 'general' }
}

// AI Messages table (follows AI SDK UIMessage format)
export const aiMessages = pgTable('ai_messages', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`), // Message ID from AI SDK
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => aiConversations.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull(), // 'system' | 'user' | 'assistant'
  parts: jsonb('parts').notNull().$type<any>(), // Array of UIMessagePart (text, tool calls, reasoning, files, etc.)
  metadata: jsonb('metadata').$type<any>(), // Optional custom metadata
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type AiMessage = typeof aiMessages.$inferSelect
export type NewAiMessage = typeof aiMessages.$inferInsert

// AI Tables - Dynamic table builder with AI-powered columns
export const aiTables = pgTable('ai_tables', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export type AiTable = typeof aiTables.$inferSelect
export type NewAiTable = typeof aiTables.$inferInsert

// AI Table Columns - Column definitions with optional AI prompts
export const aiTableColumns = pgTable('ai_table_columns', {
  id: uuid('id').primaryKey().defaultRandom(),
  tableId: uuid('table_id')
    .notNull()
    .references(() => aiTables.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  type: text('type', { enum: ['manual', 'ai'] }).notNull().default('ai'),
  description: text('description').default(''),
  outputType: text('output_type', { 
    enum: ['text', 'long_text', 'single_select', 'multi_select', 'date'] 
  }).notNull().default('text'),
  aiPrompt: text('ai_prompt').notNull().default(''),
  outputTypeConfig: jsonb('output_type_config').$type<{
    options?: Array<{ value: string; color?: string }>
    maxSelections?: number
    dateFormat?: string
  }>(),
  position: integer('position').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => [index('ai_table_columns_table_id_idx').on(table.tableId)])

export type AiTableColumn = typeof aiTableColumns.$inferSelect
export type NewAiTableColumn = typeof aiTableColumns.$inferInsert

// AI Table Records - Rows in the table
export const aiTableRecords = pgTable(
  'ai_table_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tableId: uuid('table_id')
      .notNull()
      .references(() => aiTables.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('ai_table_records_table_id_idx').on(table.tableId)],
)

export type AiTableRecord = typeof aiTableRecords.$inferSelect
export type NewAiTableRecord = typeof aiTableRecords.$inferInsert

// AI Table Cells - Individual cell data with compute status
export const aiTableCells = pgTable(
  'ai_table_cells',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    recordId: uuid('record_id')
      .notNull()
      .references(() => aiTableRecords.id, { onDelete: 'cascade' }),
    columnId: uuid('column_id')
      .notNull()
      .references(() => aiTableColumns.id, { onDelete: 'cascade' }),
    value: text('value').default(''),
    computeStatus: text('compute_status', {
      enum: ['idle', 'pending', 'computing', 'completed', 'error'],
    })
      .notNull()
      .default('idle'),
    computeError: text('compute_error'),
    computeJobId: text('compute_job_id'), // Inngest run ID for tracking
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('ai_table_cells_record_id_idx').on(table.recordId),
    index('ai_table_cells_column_id_idx').on(table.columnId),
    index('ai_table_cells_compute_status_idx').on(table.computeStatus),
    index('ai_table_cells_updated_at_idx').on(table.updatedAt),
    uniqueIndex('ai_table_cells_record_column_idx').on(
      table.recordId,
      table.columnId,
    ),
  ],
)

export type AiTableCell = typeof aiTableCells.$inferSelect
export type NewAiTableCell = typeof aiTableCells.$inferInsert

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
  aiTables: many(aiTables),
}))

export const aiConversationsRelations = relations(
  aiConversations,
  ({ one, many }) => ({
    user: one(users, {
      fields: [aiConversations.userId],
      references: [users.id],
    }),
    messages: many(aiMessages),
    // Note: table relationship is polymorphic via contextType='table' + contextId
    // We handle this at the application level rather than database level
  }),
)

export const aiMessagesRelations = relations(aiMessages, ({ one }) => ({
  conversation: one(aiConversations, {
    fields: [aiMessages.conversationId],
    references: [aiConversations.id],
  }),
}))

// AI Tables Relations
export const aiTablesRelations = relations(aiTables, ({ one, many }) => ({
  user: one(users, {
    fields: [aiTables.userId],
    references: [users.id],
  }),
  columns: many(aiTableColumns),
  records: many(aiTableRecords),
  // Note: conversations are linked via contextType='table' + contextId (polymorphic)
}))

export const aiTableColumnsRelations = relations(
  aiTableColumns,
  ({ one, many }) => ({
    table: one(aiTables, {
      fields: [aiTableColumns.tableId],
      references: [aiTables.id],
    }),
    cells: many(aiTableCells),
  }),
)

export const aiTableRecordsRelations = relations(
  aiTableRecords,
  ({ one, many }) => ({
    table: one(aiTables, {
      fields: [aiTableRecords.tableId],
      references: [aiTables.id],
    }),
    cells: many(aiTableCells),
  }),
)

export const aiTableCellsRelations = relations(aiTableCells, ({ one }) => ({
  record: one(aiTableRecords, {
    fields: [aiTableCells.recordId],
    references: [aiTableRecords.id],
  }),
  column: one(aiTableColumns, {
    fields: [aiTableCells.columnId],
    references: [aiTableColumns.id],
  }),
}))
