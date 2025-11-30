// Export auth schema
import { users, sessions, accounts, verifications } from '../auth/auth-schema'
import {
  mysqlTable,
  varchar,
  timestamp,
  decimal,
  date,
  int,
  uniqueIndex,
  json,
} from 'drizzle-orm/mysql-core'
import { randomUUID } from 'node:crypto'

export { users, sessions, accounts, verifications }

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert

export type Account = typeof accounts.$inferSelect
export type NewAccount = typeof accounts.$inferInsert

export type Verification = typeof verifications.$inferSelect
export type NewVerification = typeof verifications.$inferInsert

// ============================================
// Market Data Tables
// ============================================

/**
 * Stores daily snapshots of market indicators (ETFs, economic data, etc.)
 * For ETFs, we store adjusted close as the close value
 */
export const marketSnapshots = mysqlTable(
  'market_snapshots',
  {
    id: int('id').primaryKey().autoincrement(),
    date: date('date', { mode: 'string' }).notNull(),
    symbol: varchar('symbol', { length: 20 }).notNull(),
    // OHLCV data (close stores adjusted close for ETFs)
    open: decimal('open', { precision: 18, scale: 6 }),
    high: decimal('high', { precision: 18, scale: 6 }),
    low: decimal('low', { precision: 18, scale: 6 }),
    close: decimal('close', { precision: 18, scale: 6 }).notNull(),
    volume: decimal('volume', { precision: 18, scale: 0 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('market_snapshots_date_symbol_idx').on(table.date, table.symbol)]
)

export type MarketSnapshot = typeof marketSnapshots.$inferSelect
export type NewMarketSnapshot = typeof marketSnapshots.$inferInsert

/**
 * Tracks sync status for each symbol to avoid full backfills on re-runs
 */
export const syncMetadata = mysqlTable('sync_metadata', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  symbol: varchar('symbol', { length: 20 }).notNull().unique(),
  lastDataDate: date('last_data_date', { mode: 'string' }).notNull(), // Date of latest data point
  lastSyncAt: timestamp('last_sync_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(), // When we last attempted to sync
})

export type SyncMetadata = typeof syncMetadata.$inferSelect
export type NewSyncMetadata = typeof syncMetadata.$inferInsert

// ============================================
// User Dashboards
// ============================================

/**
 * Stores user-created dashboards with symbol lists
 */
export const dashboards = mysqlTable('dashboards', {
  id: varchar('id', { length: 255 })
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: varchar('user_id', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 1000 }),
  symbols: json('symbols').$type<string[]>().notNull().default([]),
  rangeStart: int('range_start'), // Unix timestamp, null = auto
  rangeEnd: int('range_end'), // Unix timestamp, null = auto
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

export type Dashboard = typeof dashboards.$inferSelect
export type NewDashboard = typeof dashboards.$inferInsert

