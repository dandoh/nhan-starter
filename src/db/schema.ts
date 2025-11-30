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
 */
export const marketSnapshots = mysqlTable(
  'market_snapshots',
  {
    id: int('id').primaryKey().autoincrement(),
    date: date('date', { mode: 'string' }).notNull(),
    symbol: varchar('symbol', { length: 20 }).notNull(),
    // OHLCV data
    open: decimal('open', { precision: 18, scale: 6 }),
    high: decimal('high', { precision: 18, scale: 6 }),
    low: decimal('low', { precision: 18, scale: 6 }),
    close: decimal('close', { precision: 18, scale: 6 }).notNull(),
    adjustedClose: decimal('adjusted_close', { precision: 18, scale: 6 }), // For adjusted data
    volume: decimal('volume', { precision: 18, scale: 0 }), // Volume as integer
    // Calculated changes
    change1d: decimal('change_1d', { precision: 10, scale: 4 }),
    change1w: decimal('change_1w', { precision: 10, scale: 4 }),
    change1m: decimal('change_1m', { precision: 10, scale: 4 }),
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
  lastSyncedDate: date('last_synced_date', { mode: 'string' }).notNull(), // Use string mode
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

export type SyncMetadata = typeof syncMetadata.$inferSelect
export type NewSyncMetadata = typeof syncMetadata.$inferInsert

