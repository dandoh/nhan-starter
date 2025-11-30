/**
 * Unified market data service
 * Abstracts over different data providers for easy extensibility
 */

import { alphaVantage } from './alpha-vantage'
import {
  type MarketSnapshotData,
  type HistoricalQuoteData,
  type HistoricalEconomicData,
  calculateChanges,
} from './types'
import { getETFSymbols, getEconomicSymbols, type IndicatorSymbol } from '@/config/indicators'

export * from './types'
export { alphaVantage } from './alpha-vantage'

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
      let data: HistoricalEconomicData

      if (symbol === 'US10Y') {
        data = await alphaVantage.fetchEconomicIndicator!('TREASURY_YIELD', '10year')
      } else if (symbol === 'US02Y') {
        data = await alphaVantage.fetchEconomicIndicator!('TREASURY_YIELD', '2year')
      } else if (symbol === 'FED_FUNDS') {
        data = await alphaVantage.fetchEconomicIndicator!('FEDERAL_FUNDS_RATE')
      } else {
        continue
      }

      const symbolSnapshots = processEconomicData(data)
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

/**
 * Fetch data for a single economic indicator
 */
export async function fetchEconomicData(
  symbol: 'US10Y' | 'US02Y' | 'FED_FUNDS'
): Promise<MarketSnapshotData[]> {
  let data: HistoricalEconomicData

  if (symbol === 'US10Y') {
    data = await alphaVantage.fetchEconomicIndicator!('TREASURY_YIELD', '10year')
  } else if (symbol === 'US02Y') {
    data = await alphaVantage.fetchEconomicIndicator!('TREASURY_YIELD', '2year')
  } else {
    data = await alphaVantage.fetchEconomicIndicator!('FEDERAL_FUNDS_RATE')
  }

  return processEconomicData(data)
}

/**
 * Process quote data into snapshots with calculated changes
 * Includes full OHLCV data
 */
function processQuoteData(data: HistoricalQuoteData): MarketSnapshotData[] {
  const { symbol, data: quotes } = data

  return quotes.map((quote) => {
    const changes = calculateChanges(quotes, quote.date)

    return {
      date: quote.date,
      symbol,
      open: quote.open,
      high: quote.high,
      low: quote.low,
      close: quote.close,
      adjustedClose: quote.adjustedClose,
      volume: quote.volume,
      ...changes,
    }
  })
}

/**
 * Process economic indicator data into snapshots with calculated changes
 * Economic data only has a single value (no OHLCV)
 */
function processEconomicData(data: HistoricalEconomicData): MarketSnapshotData[] {
  const { symbol, data: indicators } = data

  // Convert to quote-like format for change calculation
  const asQuotes = indicators.map((i) => ({
    symbol: i.symbol,
    date: i.date,
    open: i.value,
    high: i.value,
    low: i.value,
    close: i.value,
    volume: 0,
  }))

  return indicators.map((indicator) => {
    const changes = calculateChanges(asQuotes, indicator.date)

    return {
      date: indicator.date,
      symbol,
      close: indicator.value,
      ...changes,
    }
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

