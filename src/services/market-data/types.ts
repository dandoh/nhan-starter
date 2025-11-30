/**
 * Market data provider types
 * Designed for extensibility - can add more providers (FRED, Yahoo Finance, etc.) later
 */

import dayjs from 'dayjs'

export interface QuoteData {
  symbol: string
  date: string // YYYY-MM-DD
  open: number
  high: number
  low: number
  close: number
  adjustedClose?: number
  volume: number
}

export interface HistoricalQuoteData {
  symbol: string
  data: QuoteData[]
}

export interface EconomicIndicatorData {
  symbol: string
  date: string // YYYY-MM-DD
  value: number
}

export interface HistoricalEconomicData {
  symbol: string
  data: EconomicIndicatorData[]
}

/**
 * Provider interface for extensibility
 * Implement this interface to add new data sources
 */
export interface MarketDataProvider {
  name: string

  /**
   * Fetch historical daily quotes for an ETF/stock symbol
   */
  fetchHistoricalQuotes(symbol: string, outputSize?: 'compact' | 'full'): Promise<HistoricalQuoteData>

  /**
   * Fetch economic indicator data (treasury yields, fed funds rate, etc.)
   */
  fetchEconomicIndicator?(
    indicator: 'TREASURY_YIELD' | 'FEDERAL_FUNDS_RATE',
    maturity?: '3month' | '2year' | '5year' | '10year' | '30year'
  ): Promise<HistoricalEconomicData>
}

/**
 * Snapshot data ready for database insertion
 */
export interface MarketSnapshotData {
  date: string
  symbol: string
  open?: number
  high?: number
  low?: number
  close: number
  adjustedClose?: number
  volume?: number
  change1d?: number
  change1w?: number
  change1m?: number
}

/**
 * Calculate percentage changes from historical data
 * Uses adjustedClose when available for accurate historical comparisons
 */
export function calculateChanges(
  data: QuoteData[],
  currentDate: string
): { change1d?: number; change1w?: number; change1m?: number } {
  // Sort by date descending
  const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date))

  const currentIdx = sorted.findIndex((d) => d.date === currentDate)
  if (currentIdx === -1) return {}

  const current = sorted[currentIdx]
  const currentDay = dayjs(currentDate)

  // Use adjusted close if available, otherwise regular close
  const getPrice = (d: QuoteData) => d.adjustedClose ?? d.close

  // Find data points for 1 day, 1 week, 1 month ago
  const oneDayAgo = sorted[currentIdx + 1]
  const oneWeekAgo = sorted.find(
    (d, i) => i > currentIdx && currentDay.diff(dayjs(d.date), 'day') >= 5
  )
  const oneMonthAgo = sorted.find(
    (d, i) => i > currentIdx && currentDay.diff(dayjs(d.date), 'day') >= 20
  )

  return {
    change1d: oneDayAgo ? percentChange(getPrice(oneDayAgo), getPrice(current)) : undefined,
    change1w: oneWeekAgo ? percentChange(getPrice(oneWeekAgo), getPrice(current)) : undefined,
    change1m: oneMonthAgo ? percentChange(getPrice(oneMonthAgo), getPrice(current)) : undefined,
  }
}

function percentChange(from: number, to: number): number {
  return Number((((to - from) / from) * 100).toFixed(4))
}

