/**
 * Market data provider types
 * Designed for extensibility - can add more providers (FRED, Yahoo Finance, etc.) later
 */

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

/** Supported Alpha Vantage economic indicator functions */
export type EconomicIndicatorFunction =
  | 'TREASURY_YIELD'
  | 'FEDERAL_FUNDS_RATE'
  | 'CPI'
  | 'UNEMPLOYMENT'

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
   * Fetch economic indicator data (treasury yields, fed funds rate, CPI, unemployment, etc.)
   */
  fetchEconomicIndicator?(
    indicator: EconomicIndicatorFunction,
    maturity?: '3month' | '2year' | '5year' | '10year' | '30year'
  ): Promise<HistoricalEconomicData>
}

/**
 * Snapshot data ready for database insertion
 * For ETFs, close contains the adjusted close value
 */
export interface MarketSnapshotData {
  date: string
  symbol: string
  open?: number
  high?: number
  low?: number
  close: number
  volume?: number
}

