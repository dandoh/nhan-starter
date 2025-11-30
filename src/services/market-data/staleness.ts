/**
 * Staleness check utilities for market data
 * Determines which symbols need to be fetched/refreshed
 */

import dayjs from 'dayjs'
import { db } from '@/db'
import { syncMetadata } from '@/db/schema'
import { inArray } from 'drizzle-orm'
import type { IndicatorSymbol } from '@/config/indicators'

const STALE_THRESHOLD_HOURS = 20

/**
 * Get symbols that are stale or have never been fetched
 * A symbol is considered stale if:
 * - It has no entry in syncMetadata (never fetched)
 * - Its lastSyncAt is more than 20 hours ago
 */
export async function getStaleSymbols(symbols: IndicatorSymbol[]): Promise<IndicatorSymbol[]> {
  if (symbols.length === 0) return []

  // Get sync metadata for requested symbols
  const syncRecords = await db
    .select({
      symbol: syncMetadata.symbol,
      lastSyncAt: syncMetadata.lastSyncAt,
    })
    .from(syncMetadata)
    .where(inArray(syncMetadata.symbol, symbols))

  // Create a map of symbol -> lastSyncAt
  const syncMap = new Map(syncRecords.map((r) => [r.symbol, r.lastSyncAt]))

  const now = dayjs()
  const staleSymbols: IndicatorSymbol[] = []

  for (const symbol of symbols) {
    const lastSyncAt = syncMap.get(symbol)

    if (!lastSyncAt) {
      // Never fetched
      staleSymbols.push(symbol)
      continue
    }

    // Check if last sync was more than 24 hours ago
    const hoursSinceSync = now.diff(dayjs(lastSyncAt), 'hour')
    if (hoursSinceSync >= STALE_THRESHOLD_HOURS) {
      staleSymbols.push(symbol)
    }
  }

  return staleSymbols
}

/**
 * Check if a single symbol is stale
 */
export async function isSymbolStale(symbol: IndicatorSymbol): Promise<boolean> {
  const stale = await getStaleSymbols([symbol])
  return stale.length > 0
}

