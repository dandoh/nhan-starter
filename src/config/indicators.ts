/**
 * Market indicator configuration
 * Categories are used for UI grouping in the dashboard
 */

export const INDICATOR_CATEGORIES = {
  volatility: 'Volatility',
  currency: 'Currency',
  rates: 'Rates',
  credit: 'Credit',
  commodities: 'Commodities',
  sector: 'Sectors',
} as const

export type IndicatorCategory = keyof typeof INDICATOR_CATEGORIES

export interface IndicatorConfig {
  category: IndicatorCategory
  name?: string // Optional display name override
  description?: string
}

/**
 * All tracked indicators with their configurations
 * Symbol is used as the key and matches what's stored in the database
 */
export const INDICATORS = {
  // Volatility
  VIXY: { category: 'volatility', name: 'VIX', description: 'CBOE Volatility Index (via VIXY ETF)' },

  // Currency
  UUP: { category: 'currency', name: 'DXY', description: 'US Dollar Index (via UUP ETF)' },

  // Rates (via Alpha Vantage economic indicators)
  US10Y: { category: 'rates', name: '10Y Treasury', description: '10-Year Treasury Yield' },
  US02Y: { category: 'rates', name: '2Y Treasury', description: '2-Year Treasury Yield' },
  FED_FUNDS: { category: 'rates', name: 'Fed Funds', description: 'Federal Funds Rate' },

  // Credit
  HYG: { category: 'credit', name: 'High Yield', description: 'iShares High Yield Corporate Bond ETF' },
  LQD: { category: 'credit', name: 'Inv Grade', description: 'iShares Investment Grade Corporate Bond ETF' },

  // Commodities
  GLD: { category: 'commodities', name: 'Gold', description: 'SPDR Gold Shares ETF' },
  SLV: { category: 'commodities', name: 'Silver', description: 'iShares Silver Trust ETF' },

  // Sectors (S&P 500 GICS Sectors)
  XLK: { category: 'sector', name: 'Technology', description: 'Technology Select Sector SPDR' },
  XLF: { category: 'sector', name: 'Financials', description: 'Financial Select Sector SPDR' },
  XLE: { category: 'sector', name: 'Energy', description: 'Energy Select Sector SPDR' },
  XLV: { category: 'sector', name: 'Healthcare', description: 'Health Care Select Sector SPDR' },
  XLI: { category: 'sector', name: 'Industrials', description: 'Industrial Select Sector SPDR' },
  XLY: { category: 'sector', name: 'Cons Disc', description: 'Consumer Discretionary Select Sector SPDR' },
  XLP: { category: 'sector', name: 'Cons Staples', description: 'Consumer Staples Select Sector SPDR' },
  XLB: { category: 'sector', name: 'Materials', description: 'Materials Select Sector SPDR' },
  XLRE: { category: 'sector', name: 'Real Estate', description: 'Real Estate Select Sector SPDR' },
  XLU: { category: 'sector', name: 'Utilities', description: 'Utilities Select Sector SPDR' },
  XLC: { category: 'sector', name: 'Comm Svcs', description: 'Communication Services Select Sector SPDR' },
} as const satisfies Record<string, IndicatorConfig>

export type IndicatorSymbol = keyof typeof INDICATORS

/**
 * Get all symbols for a specific category
 */
export function getSymbolsByCategory(category: IndicatorCategory): IndicatorSymbol[] {
  return (Object.entries(INDICATORS) as [IndicatorSymbol, IndicatorConfig][])
    .filter(([_, config]) => config.category === category)
    .map(([symbol]) => symbol)
}

/**
 * Get all ETF symbols (for Alpha Vantage stock API)
 */
export function getETFSymbols(): IndicatorSymbol[] {
  return (Object.keys(INDICATORS) as IndicatorSymbol[]).filter(
    (symbol) => !['US10Y', 'US02Y', 'FED_FUNDS'].includes(symbol)
  )
}

/**
 * Get all economic indicator symbols (for Alpha Vantage economic API)
 */
export function getEconomicSymbols(): IndicatorSymbol[] {
  return ['US10Y', 'US02Y', 'FED_FUNDS'] as IndicatorSymbol[]
}

/**
 * Get display name for a symbol
 */
export function getDisplayName(symbol: IndicatorSymbol): string {
  return INDICATORS[symbol].name || symbol
}

/**
 * All symbols as an array
 */
export const ALL_SYMBOLS = Object.keys(INDICATORS) as IndicatorSymbol[]

