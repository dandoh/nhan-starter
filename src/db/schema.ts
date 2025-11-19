// Export auth schema
import { users, sessions, accounts, verifications } from '../auth/auth-schema'
import { mysqlTable, varchar, timestamp, boolean, text, decimal } from 'drizzle-orm/mysql-core'

export { users, sessions, accounts, verifications }

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert

export type Account = typeof accounts.$inferSelect
export type NewAccount = typeof accounts.$inferInsert

export type Verification = typeof verifications.$inferSelect
export type NewVerification = typeof verifications.$inferInsert

// Todos table
export const todos = mysqlTable('todos', {
  id: varchar('id', { length: 255 }).primaryKey(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  completed: boolean('completed').default(false).notNull(),
  userId: varchar('user_id', { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

export type Todo = typeof todos.$inferSelect
export type NewTodo = typeof todos.$inferInsert

// Expenses table
export const expenses = mysqlTable('expenses', {
  id: varchar('id', { length: 255 }).primaryKey(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  description: varchar('description', { length: 500 }).notNull(),
  category: varchar('category', { length: 255 }),
  date: timestamp('date').notNull(),
  notes: text('notes'),
  userId: varchar('user_id', { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

export type Expense = typeof expenses.$inferSelect
export type NewExpense = typeof expenses.$inferInsert
