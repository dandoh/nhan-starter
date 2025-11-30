/**
 * Script to fetch market data from Alpha Vantage
 * Run with: pnpm tsx src/scripts/fetch-market-data.ts
 *
 * Options:
 * - --compact: Fetch only latest 100 data points (default: full history)
 * - --reset: Clear all existing data before fetching
 *
 * Features:
 * - Automatically skips existing records (safe to re-run)
 * - Supports historical backfill (re-run with full to get more history)
 * - Rate limits to stay within Alpha Vantage premium tier (75 calls/minute)
 */

import { db } from '@/db'
import { marketSnapshots, syncMetadata } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { fetchETFData, fetchEconomicData, type MarketSnapshotData } from '@/services/market-data'
import { getETFSymbols, getEconomicSymbols, type IndicatorSymbol } from '@/config/indicators'

const RATE_LIMIT_DELAY = 1000 // 1 second between calls (75 calls/minute premium tier)

async function main() {
  console.log('🚀 Starting market data fetch...\n')

  const args = process.argv.slice(2)

  // Handle --reset flag to clear all data
  if (args.includes('--reset')) {
    console.log('⚠️  Resetting all market data...')
    await db.delete(syncMetadata)
    await db.delete(marketSnapshots)
    console.log('✅ All data cleared!\n')
  }

  const outputSize = args.includes('--compact') ? 'compact' : 'full'

  console.log(`   Mode: ${outputSize} (use --compact for latest 100 days only)\n`)

  const etfSymbols = getETFSymbols()
  const economicSymbols = getEconomicSymbols()

  let totalInserted = 0
  let totalSkipped = 0

  // Process ETF symbols
  for (const symbol of etfSymbols) {
    const result = await processSymbol(symbol, 'etf', outputSize)
    totalInserted += result.inserted
    totalSkipped += result.skipped

    if (symbol !== etfSymbols[etfSymbols.length - 1]) {
      await sleep(RATE_LIMIT_DELAY)
    }
  }

  // Process economic indicators
  for (const symbol of economicSymbols) {
    const result = await processSymbol(symbol, 'economic', outputSize)
    totalInserted += result.inserted
    totalSkipped += result.skipped

    if (symbol !== economicSymbols[economicSymbols.length - 1]) {
      await sleep(RATE_LIMIT_DELAY)
    }
  }

  console.log('\n✅ Fetch complete!')
  console.log(`   Total inserted: ${totalInserted}`)
  console.log(`   Total skipped (already exists): ${totalSkipped}`)
}

async function processSymbol(
  symbol: IndicatorSymbol,
  type: 'etf' | 'economic',
  outputSize: 'compact' | 'full'
): Promise<{ inserted: number; skipped: number }> {
  console.log(`📊 Processing ${symbol}...`)

  // Fetch data from Alpha Vantage
  let snapshots: MarketSnapshotData[]
  try {
    if (type === 'etf') {
      snapshots = await fetchETFData(symbol, outputSize)
    } else {
      snapshots = await fetchEconomicData(symbol as 'US10Y' | 'US02Y' | 'FED_FUNDS')
    }
    console.log(`   Fetched ${snapshots.length} data points`)
  } catch (error) {
    console.error(`   ❌ Failed to fetch: ${error}`)
    return { inserted: 0, skipped: 0 }
  }

  // Insert data (skips existing records)
  let inserted = 0
  let skipped = 0
  
  for (const snapshot of snapshots) {
    try {
      // Check if already exists (using string date directly)
      const existing = await db
        .select({ id: marketSnapshots.id })
        .from(marketSnapshots)
        .where(
          and(eq(marketSnapshots.date, snapshot.date), eq(marketSnapshots.symbol, snapshot.symbol))
        )
        .limit(1)

      if (existing.length > 0) {
        skipped++
        continue
      }

      // Insert new record with OHLCV data
      await db.insert(marketSnapshots).values({
        date: snapshot.date,
        symbol: snapshot.symbol,
        open: snapshot.open?.toString() ?? null,
        high: snapshot.high?.toString() ?? null,
        low: snapshot.low?.toString() ?? null,
        close: snapshot.close.toString(),
        adjustedClose: snapshot.adjustedClose?.toString() ?? null,
        volume: snapshot.volume?.toString() ?? null,
        change1d: snapshot.change1d?.toString() ?? null,
        change1w: snapshot.change1w?.toString() ?? null,
        change1m: snapshot.change1m?.toString() ?? null,
      })
      inserted++
    } catch (error) {
      console.error(`   Error inserting ${snapshot.date}: ${error}`)
    }
  }

  // Update sync metadata with latest date
  if (inserted > 0 && snapshots.length > 0) {
    const latestDate = snapshots.reduce((max, s) => (s.date > max ? s.date : max), snapshots[0].date)

    // Upsert sync metadata
    const existingSync = await db
      .select()
      .from(syncMetadata)
      .where(eq(syncMetadata.symbol, symbol))
      .limit(1)

    if (existingSync.length > 0) {
      // Only update if new date is more recent (string comparison works for YYYY-MM-DD)
      if (latestDate > existingSync[0].lastSyncedDate) {
        await db
          .update(syncMetadata)
          .set({ lastSyncedDate: latestDate })
          .where(eq(syncMetadata.symbol, symbol))
      }
    } else {
      await db.insert(syncMetadata).values({
        symbol,
        lastSyncedDate: latestDate,
      })
    }
  }

  console.log(`   ✓ Inserted: ${inserted}, Skipped: ${skipped}`)
  return { inserted, skipped }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
}).then(() => {
  console.log('✅ Fetch complete!')
  process.exit(0)
})

