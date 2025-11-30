/**
 * Fetch and store market data service
 * Handles fetching from Alpha Vantage with retry logic and storing to database
 */

import { db } from '@/db'
import { marketSnapshots, syncMetadata } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'
import {
  fetchETFData,
  fetchEconomicData,
  type MarketSnapshotData,
  type EconomicSymbol,
} from './index'
import {
  getEconomicSymbols,
  type IndicatorSymbol,
} from '@/config/indicators'

const BATCH_SIZE = 500 // Insert in batches to avoid query size limits
const RATE_LIMIT_RETRY_DELAY = 1000 // 1 second delay on rate limit

/**
 * Error thrown when Alpha Vantage rate limit is hit
 */
export class RateLimitError extends Error {
  constructor(message: string = 'Alpha Vantage API rate limit exceeded') {
    super(message)
    this.name = 'RateLimitError'
  }
}

/**
 * Check if error is a rate limit error
 */
function isRateLimitError(error: unknown): boolean {
  if (error instanceof RateLimitError) return true
  if (error instanceof Error) {
    return error.message.includes('rate limit') || error.message.includes('call frequency')
  }
  return false
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Execute a function with retry logic for rate limits
 */
export async function fetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  maxRetries: number = 5
): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchFn()
    } catch (error) {
      lastError = error

      if (isRateLimitError(error) && attempt < maxRetries) {
        console.log(`Rate limit hit, retrying in ${RATE_LIMIT_RETRY_DELAY}ms (attempt ${attempt}/${maxRetries})...`)
        await sleep(RATE_LIMIT_RETRY_DELAY)
        continue
      }

      throw error
    }
  }

  throw lastError
}

/**
 * Determine if a symbol is an ETF or economic indicator
 */
function getSymbolType(symbol: IndicatorSymbol): 'etf' | 'economic' {
  const economicSymbols = getEconomicSymbols()
  return economicSymbols.includes(symbol) ? 'economic' : 'etf'
}

/**
 * Fetch data for a symbol from Alpha Vantage
 */
async function fetchSymbolData(
  symbol: IndicatorSymbol,
  outputSize: 'compact' | 'full' = 'full'
): Promise<MarketSnapshotData[]> {
  const type = getSymbolType(symbol)

  if (type === 'etf') {
    return fetchETFData(symbol, outputSize)
  } else {
    return fetchEconomicData(symbol as EconomicSymbol)
  }
}

/**
 * Bulk upsert market snapshots using ON DUPLICATE KEY UPDATE
 */
async function bulkUpsert(snapshots: MarketSnapshotData[]): Promise<void> {
  if (snapshots.length === 0) return

  const values = snapshots.map((snapshot) => ({
    date: snapshot.date,
    symbol: snapshot.symbol,
    open: snapshot.open?.toString() ?? null,
    high: snapshot.high?.toString() ?? null,
    low: snapshot.low?.toString() ?? null,
    close: snapshot.close.toString(),
    volume: snapshot.volume?.toString() ?? null,
  }))

  await db
    .insert(marketSnapshots)
    .values(values)
    .onDuplicateKeyUpdate({
      set: {
        open: sql`VALUES(open)`,
        high: sql`VALUES(high)`,
        low: sql`VALUES(low)`,
        close: sql`VALUES(close)`,
        volume: sql`VALUES(volume)`,
      },
    })
}

/**
 * Update sync metadata for a symbol
 * Always updates to refresh lastSyncAt timestamp (tracks last sync attempt)
 */
async function updateSyncMetadata(symbol: string, latestDate: string): Promise<void> {
  const existing = await db
    .select()
    .from(syncMetadata)
    .where(eq(syncMetadata.symbol, symbol))
    .limit(1)

  if (existing.length > 0) {
    // Always update to refresh lastSyncAt (even if lastDataDate is the same)
    // Use the newer date if available
    const newDate = latestDate > existing[0].lastDataDate ? latestDate : existing[0].lastDataDate
    await db
      .update(syncMetadata)
      .set({ lastDataDate: newDate })
      .where(eq(syncMetadata.symbol, symbol))
  } else {
    await db.insert(syncMetadata).values({
      symbol,
      lastDataDate: latestDate,
    })
  }
}

/**
 * Fetch data from Alpha Vantage and store to database
 * Includes retry logic for rate limits
 */
export async function fetchAndStoreSymbol(
  symbol: IndicatorSymbol,
  outputSize: 'compact' | 'full' = 'full'
): Promise<{ success: boolean; recordCount: number; error?: string }> {
  console.log(`[fetch] Fetching ${symbol}...`)

  try {
    // Fetch with retry logic
    const snapshots = await fetchWithRetry(() => fetchSymbolData(symbol, outputSize))

    if (snapshots.length === 0) {
      console.log(`[fetch] No data returned for ${symbol}`)
      return { success: true, recordCount: 0 }
    }

    console.log(`[fetch] Got ${snapshots.length} records for ${symbol}`)

    // Bulk upsert in batches
    for (let i = 0; i < snapshots.length; i += BATCH_SIZE) {
      const batch = snapshots.slice(i, i + BATCH_SIZE)
      await bulkUpsert(batch)
    }

    // Update sync metadata with current timestamp (we use latest date as reference)
    const latestDate = snapshots.reduce(
      (max, s) => (s.date > max ? s.date : max),
      snapshots[0].date
    )
    await updateSyncMetadata(symbol, latestDate)

    console.log(`[fetch] Stored ${snapshots.length} records for ${symbol}`)
    return { success: true, recordCount: snapshots.length }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[fetch] Failed to fetch ${symbol}: ${errorMessage}`)
    return { success: false, recordCount: 0, error: errorMessage }
  }
}

/**
 * Fetch and store multiple symbols
 */
export async function fetchAndStoreSymbols(
  symbols: IndicatorSymbol[],
  outputSize: 'compact' | 'full' = 'full'
): Promise<{ symbol: string; success: boolean; recordCount: number; error?: string }[]> {
  const results: { symbol: string; success: boolean; recordCount: number; error?: string }[] = []

  for (const symbol of symbols) {
    const result = await fetchAndStoreSymbol(symbol, outputSize)
    results.push({ symbol, ...result })
  }

  return results
}

