import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
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
  // Context - allows conversation to be scoped to different entities (table, workbook, etc.)
  contextType: text('context_type', { enum: ['general', 'table', 'workbook'] })
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
  z.object({ type: z.literal('workbook'), workbookId: z.string().uuid() }),
])

// Helper type for conversation context (inferred from schema)
export type ConversationContext = z.infer<typeof conversationContextSchema>

// Helper to create context fields from ConversationContext
export function conversationContextToFields(context: ConversationContext): {
  contextType: 'general' | 'table' | 'workbook'
  contextId: string | null
} {
  if (context.type === 'general') {
    return { contextType: 'general', contextId: null }
  }
  if (context.type === 'table') {
    return { contextType: 'table', contextId: context.tableId }
  }
  return { contextType: 'workbook', contextId: context.workbookId }
}

// Helper to parse context fields back to ConversationContext
export function fieldsToConversationContext(
  contextType: string | null,
  contextId: string | null,
): ConversationContext {
  if (contextType === 'table' && contextId) {
    return { type: 'table', tableId: contextId }
  }
  if (contextType === 'workbook' && contextId) {
    return { type: 'workbook', workbookId: contextId }
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
  role: varchar('role', { length: 20 }).$type<('system' | 'user' | 'assistant')>().notNull(), // 'system' | 'user' | 'assistant'
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
  description: text('description').default(''),
  columnSizing: jsonb('column_sizing').$type<Record<string, number>>(),
  columnPinning: jsonb('column_pinning').$type<{ left?: string[]; right?: string[] }>(),
  columnOrder: jsonb('column_order').$type<string[]>(),
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

// Output type enum - single source of truth
export const AI_TABLE_OUTPUT_TYPES = [
  'text',
  'long_text',
  'single_select',
  'multi_select',
  'date',
  'file',
] as const

export type AiTableOutputType = (typeof AI_TABLE_OUTPUT_TYPES)[number]

// Zod schema for output type validation
// Using z.union with z.literal ensures proper literal type inference
export const aiTableOutputTypeSchema = z.union([
  z.literal(AI_TABLE_OUTPUT_TYPES[0]),
  z.literal(AI_TABLE_OUTPUT_TYPES[1]),
  z.literal(AI_TABLE_OUTPUT_TYPES[2]),
  z.literal(AI_TABLE_OUTPUT_TYPES[3]),
  z.literal(AI_TABLE_OUTPUT_TYPES[4]),
  z.literal(AI_TABLE_OUTPUT_TYPES[5]),
])

export const aiTableColumns = pgTable('ai_table_columns', {
  id: uuid('id').primaryKey().defaultRandom(),
  tableId: uuid('table_id')
    .notNull()
    .references(() => aiTables.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').default(''),
  outputType: text('output_type', { 
    enum: AI_TABLE_OUTPUT_TYPES 
  }).notNull().default('text'),
  aiPrompt: text('ai_prompt').notNull().default(''),
  outputTypeConfig: jsonb('output_type_config').$type<{
    options?: Array<{ value: string; color?: string }>
    maxSelections?: number
    dateFormat?: string
  }>(),
  primary: boolean('primary').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => [
  index('ai_table_columns_table_id_idx').on(table.tableId),
  index('ai_table_columns_primary_idx').on(table.primary),
])

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
    value: jsonb('value').$type<Record<string, unknown> | null>(),
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

// Workbooks - Collection of blocks (tables, charts, docs)
export const workbooks = pgTable('workbooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').default(''),
  status: text('status', { enum: ['exploratory', 'in_progress', 'ready'] })
    .notNull()
    .default('exploratory'),
  blockOrder: jsonb('block_order').$type<string[]>(), // Array of block IDs
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export type Workbook = typeof workbooks.$inferSelect
export type NewWorkbook = typeof workbooks.$inferInsert

// Workbook Blocks - Individual blocks within a workbook (table/chart/doc)

// Block type enum - single source of truth
export const WORKBOOK_BLOCK_TYPES = ['table', 'file_table_workflow'] as const
export type WorkbookBlockType = (typeof WORKBOOK_BLOCK_TYPES)[number]

export const workbookBlocks = pgTable(
  'workbook_blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workbookId: uuid('workbook_id')
      .notNull()
      .references(() => workbooks.id, { onDelete: 'cascade' }),
    blockType: text('block_type', { enum: WORKBOOK_BLOCK_TYPES })
      .notNull()
      .default('table'),
    // Type-specific foreign keys (nullable for extensibility)
    tableId: uuid('table_id').references(() => aiTables.id, {
      onDelete: 'cascade',
    }),
    fileTableWorkflowId: uuid('file_table_workflow_id').references(
      () => fileTableWorkflows.id,
      {
        onDelete: 'cascade',
      },
    ),
    // Future: chartId, docId as nullable columns
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('workbook_blocks_workbook_id_idx').on(table.workbookId),
    index('workbook_blocks_block_type_idx').on(table.blockType),
    index('workbook_blocks_table_id_idx').on(table.tableId),
    index('workbook_blocks_file_table_workflow_id_idx').on(
      table.fileTableWorkflowId,
    ),
  ],
)

export type WorkbookBlock = typeof workbookBlocks.$inferSelect
export type NewWorkbookBlock = typeof workbookBlocks.$inferInsert

// File Table Workflow - Workflow for creating tables from files

// Type definitions for JSON fields
export type FileTableWorkflowFile = {
  id: string
  s3Bucket: string
  s3Key: string
  filename: string
  size: number
  status: string
}

export type FileTableWorkflowColumn = {
  name: string
  outputType: AiTableOutputType
  autoPopulate: boolean
  primary: boolean
}

export const fileTableWorkflows = pgTable(
  'file_table_workflows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    files: jsonb('files')
      .$type<FileTableWorkflowFile[]>()
      .notNull()
      .default([]),
    suggestedColumns: jsonb('suggested_columns')
      .$type<FileTableWorkflowColumn[]>()
      .notNull()
      .default([]),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('file_table_workflows_user_id_idx').on(table.userId),
  ],
)

export type FileTableWorkflow =
  typeof fileTableWorkflows.$inferSelect
export type NewFileTableWorkflow =
  typeof fileTableWorkflows.$inferInsert

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

// Workbook Relations
export const workbooksRelations = relations(workbooks, ({ one, many }) => ({
  user: one(users, {
    fields: [workbooks.userId],
    references: [users.id],
  }),
  blocks: many(workbookBlocks),
}))

export const workbookBlocksRelations = relations(
  workbookBlocks,
  ({ one }) => ({
    workbook: one(workbooks, {
      fields: [workbookBlocks.workbookId],
      references: [workbooks.id],
    }),
    table: one(aiTables, {
      fields: [workbookBlocks.tableId],
      references: [aiTables.id],
    }),
    fileTableWorkflow: one(fileTableWorkflows, {
      fields: [workbookBlocks.fileTableWorkflowId],
      references: [fileTableWorkflows.id],
    }),
  }),
)

// File Table Workflow Relations
export const fileTableWorkflowsRelations = relations(
  fileTableWorkflows,
  ({ one }) => ({
    user: one(users, {
      fields: [fileTableWorkflows.userId],
      references: [users.id],
    }),
  }),
)
