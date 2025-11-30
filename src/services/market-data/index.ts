/**
 * Unified market data service
 * Abstracts over different data providers for easy extensibility
 */

import { alphaVantage } from './alpha-vantage'
import {
  type MarketSnapshotData,
  type HistoricalQuoteData,
  type HistoricalEconomicData,
} from './types'
import { getETFSymbols, getEconomicSymbols, type IndicatorSymbol } from '@/config/indicators'

export * from './types'
export { alphaVantage } from './alpha-vantage'
export { fetchAndStoreSymbol, fetchAndStoreSymbols, fetchWithRetry } from './fetch'
export { getStaleSymbols, isSymbolStale } from './staleness'

/**
 * Fetch all market data and prepare for database insertion
 * Returns snapshots for all dates in the historical data
 */
export async function fetchAllMarketData(options?: {
  outputSize?: 'compact' | 'full'
  symbols?: IndicatorSymbol[]
}): Promise<MarketSnapshotData[]> {
  const outputSize = options?.outputSize ?? 'compact'
  const symbols = options?.symbols

  const etfSymbols = symbols
    ? symbols.filter((s) => getETFSymbols().includes(s))
    : getETFSymbols()
  const economicSymbols = symbols
    ? symbols.filter((s) => getEconomicSymbols().includes(s))
    : getEconomicSymbols()

  const snapshots: MarketSnapshotData[] = []

  // Fetch ETF data
  for (const symbol of etfSymbols) {
    try {
      console.log(`Fetching ${symbol}...`)
      const data = await alphaVantage.fetchHistoricalQuotes(symbol, outputSize)
      const symbolSnapshots = processQuoteData(data)
      snapshots.push(...symbolSnapshots)

      // Rate limiting - Alpha Vantage free tier is 5 calls/minute
      await sleep(12500) // ~5 calls per minute
    } catch (error) {
      console.error(`Failed to fetch ${symbol}:`, error)
    }
  }

  // Fetch economic indicators
  for (const symbol of economicSymbols) {
    try {
      console.log(`Fetching ${symbol}...`)
      const symbolSnapshots = await fetchEconomicData(symbol as EconomicSymbol)
      snapshots.push(...symbolSnapshots)
      await sleep(12500)
    } catch (error) {
      console.error(`Failed to fetch ${symbol}:`, error)
    }
  }

  return snapshots
}

/**
 * Fetch data for a single ETF symbol
 */
export async function fetchETFData(
  symbol: string,
  outputSize: 'compact' | 'full' = 'compact'
): Promise<MarketSnapshotData[]> {
  const data = await alphaVantage.fetchHistoricalQuotes(symbol, outputSize)
  return processQuoteData(data)
}

/** Economic indicator symbols */
export type EconomicSymbol = 'US10Y' | 'US02Y' | 'FED_FUNDS' | 'CPI' | 'UNEMPLOYMENT'

/**
 * Fetch data for a single economic indicator
 */
export async function fetchEconomicData(symbol: EconomicSymbol): Promise<MarketSnapshotData[]> {
  let data: HistoricalEconomicData

  switch (symbol) {
    case 'US10Y':
      data = await alphaVantage.fetchEconomicIndicator!('TREASURY_YIELD', '10year')
      break
    case 'US02Y':
      data = await alphaVantage.fetchEconomicIndicator!('TREASURY_YIELD', '2year')
      break
    case 'FED_FUNDS':
      data = await alphaVantage.fetchEconomicIndicator!('FEDERAL_FUNDS_RATE')
      break
    case 'CPI':
      data = await alphaVantage.fetchEconomicIndicator!('CPI')
      break
    case 'UNEMPLOYMENT':
      data = await alphaVantage.fetchEconomicIndicator!('UNEMPLOYMENT')
      break
    default:
      throw new Error(`Unknown economic symbol: ${symbol}`)
  }

  return processEconomicData(data)
}

/**
 * Process quote data into snapshots
 * Uses adjustedClose as the close value (for accurate historical comparisons)
 */
function processQuoteData(data: HistoricalQuoteData): MarketSnapshotData[] {
  const { symbol, data: quotes } = data

  return quotes.map((quote) => ({
    date: quote.date,
    symbol,
    open: quote.open,
    high: quote.high,
    low: quote.low,
    close: quote.adjustedClose ?? quote.close, // Use adjusted close as close
    volume: quote.volume,
  }))
}

/**
 * Process economic indicator data into snapshots
 * Economic data only has a single value (no OHLCV)
 */
function processEconomicData(data: HistoricalEconomicData): MarketSnapshotData[] {
  const { symbol, data: indicators } = data

  return indicators.map((indicator) => ({
    date: indicator.date,
    symbol,
    close: indicator.value,
  }))
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

