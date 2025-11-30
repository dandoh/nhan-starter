/**
 * Script to fetch market data from Alpha Vantage
 * Run with: pnpm tsx src/scripts/fetch-market-data.ts
 *
 * Options:
 * - --compact: Fetch only latest 100 data points (default: full history)
 * - --reset: Clear all existing data before fetching
 *
 * Features:
 * - Bulk upserts (inserts new records, updates existing ones)
 * - Supports historical backfill (re-run with full to get more history)
 * - Rate limits to stay within Alpha Vantage premium tier (75 calls/minute)
 *
 * Note: This script is now optional - the API endpoint will automatically
 * fetch stale data when needed. Use this for initial bulk import or manual refresh.
 */

import { db } from '@/db'
import { marketSnapshots, syncMetadata } from '@/db/schema'
import { fetchAndStoreSymbol } from '@/services/market-data'
import { ALL_SYMBOLS } from '@/config/indicators'

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

  // Get all symbols to fetch
  const symbols = ALL_SYMBOLS

  let totalUpserted = 0
  let successCount = 0
  let failCount = 0

  // Process all symbols
  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i]
    console.log(`📊 [${i + 1}/${symbols.length}] Processing ${symbol}...`)

    const result = await fetchAndStoreSymbol(symbol, outputSize)

    if (result.success) {
      totalUpserted += result.recordCount
      successCount++
      console.log(`   ✓ ${result.recordCount} records`)
    } else {
      failCount++
      console.log(`   ❌ Failed: ${result.error}`)
    }

    // Rate limit delay between calls (except for last one)
    if (i < symbols.length - 1) {
      await sleep(RATE_LIMIT_DELAY)
    }
  }

  console.log('\n✅ Fetch complete!')
  console.log(`   Symbols processed: ${successCount}/${symbols.length}`)
  console.log(`   Failed: ${failCount}`)
  console.log(`   Total records upserted: ${totalUpserted}`)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Run the script
main()
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
  .then(() => {
    process.exit(0)
  })
