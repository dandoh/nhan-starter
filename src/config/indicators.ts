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
  benchmarks: 'Benchmarks',
  economic: 'Economic',
  ratio: 'Ratios',
} as const

export type IndicatorCategory = keyof typeof INDICATOR_CATEGORIES

export interface IndicatorConfig {
  category: IndicatorCategory
  name?: string // Optional display name override
  description?: string // Short description (e.g., ETF name)
  detail?: string // Detailed explanation of what this tracks
}

/**
 * All tracked indicators with their configurations
 * Symbol is used as the key and matches what's stored in the database
 */
export const INDICATORS = {
  // Volatility
  VIXY: {
    category: 'volatility',
    name: 'VIX',
    description: 'CBOE Volatility Index (via VIXY ETF)',
    detail: 'Measures expected 30-day volatility of S&P 500. High values signal fear, low values signal complacency.',
  },

  // Currency
  UUP: {
    category: 'currency',
    name: 'DXY',
    description: 'US Dollar Index (via UUP ETF)',
    detail: 'Tracks USD strength against basket of major currencies (EUR, JPY, GBP, CAD, SEK, CHF).',
  },

  // Rates (via Alpha Vantage economic indicators)
  US10Y: {
    category: 'rates',
    name: '10Y Treasury',
    description: '10-Year Treasury Yield',
    detail: 'Benchmark for mortgage rates and long-term borrowing costs. Key indicator of economic growth expectations.',
  },
  US02Y: {
    category: 'rates',
    name: '2Y Treasury',
    description: '2-Year Treasury Yield',
    detail: 'Sensitive to Fed policy expectations. 10Y-2Y spread (yield curve) signals recession when inverted.',
  },
  FED_FUNDS: {
    category: 'rates',
    name: 'Fed Funds',
    description: 'Federal Funds Rate',
    detail: 'The Fed\'s primary tool for monetary policy. Influences all other interest rates in the economy.',
  },
  TLT: {
    category: 'rates',
    name: '20Y+ Treasury',
    description: 'iShares 20+ Year Treasury Bond ETF',
    detail: 'Long-duration Treasury bonds. Highly sensitive to rate changes. Falls when rates rise.',
  },

  // Credit
  HYG: {
    category: 'credit',
    name: 'High Yield',
    description: 'iShares High Yield Corporate Bond ETF',
    detail: 'Tracks junk bonds (BB and below). Spread vs Treasuries indicates credit risk appetite.',
  },
  LQD: {
    category: 'credit',
    name: 'Inv Grade',
    description: 'iShares Investment Grade Corporate Bond ETF',
    detail: 'Tracks investment-grade corporate bonds (BBB and above). Less risky than high yield.',
  },

  // Commodities
  GLD: {
    category: 'commodities',
    name: 'Gold',
    description: 'SPDR Gold Shares ETF',
    detail: 'Safe-haven asset. Rises during uncertainty, inflation fears, and dollar weakness.',
  },
  SLV: {
    category: 'commodities',
    name: 'Silver',
    description: 'iShares Silver Trust ETF',
    detail: 'Industrial + precious metal. More volatile than gold. Gold/Silver ratio indicates risk sentiment.',
  },

  // Sectors (S&P 500 GICS Sectors)
  XLK: {
    category: 'sector',
    name: 'Technology',
    description: 'Technology Select Sector SPDR',
    detail: 'Apple, Microsoft, Nvidia, etc. Growth-sensitive, benefits from low rates.',
  },
  XLF: {
    category: 'sector',
    name: 'Financials',
    description: 'Financial Select Sector SPDR',
    detail: 'Banks, insurance, asset managers. Benefits from higher rates and steeper yield curve.',
  },
  XLE: {
    category: 'sector',
    name: 'Energy',
    description: 'Energy Select Sector SPDR',
    detail: 'Oil & gas companies. Correlated with crude oil prices and global demand.',
  },
  XLV: {
    category: 'sector',
    name: 'Healthcare',
    description: 'Health Care Select Sector SPDR',
    detail: 'Pharma, biotech, healthcare providers. Defensive sector with steady demand.',
  },
  XLI: {
    category: 'sector',
    name: 'Industrials',
    description: 'Industrial Select Sector SPDR',
    detail: 'Aerospace, machinery, transportation. Cyclical, tracks economic expansion.',
  },
  XLY: {
    category: 'sector',
    name: 'Cons Disc',
    description: 'Consumer Discretionary Select Sector SPDR',
    detail: 'Amazon, Tesla, retail. Sensitive to consumer confidence and spending.',
  },
  XLP: {
    category: 'sector',
    name: 'Cons Staples',
    description: 'Consumer Staples Select Sector SPDR',
    detail: 'P&G, Coca-Cola, Walmart. Defensive, steady demand regardless of economy.',
  },
  XLB: {
    category: 'sector',
    name: 'Materials',
    description: 'Materials Select Sector SPDR',
    detail: 'Chemicals, metals, mining. Cyclical, tied to industrial production and commodities.',
  },
  XLRE: {
    category: 'sector',
    name: 'Real Estate',
    description: 'Real Estate Select Sector SPDR',
    detail: 'REITs and real estate companies. Rate-sensitive, yields compete with bonds.',
  },
  XLU: {
    category: 'sector',
    name: 'Utilities',
    description: 'Utilities Select Sector SPDR',
    detail: 'Electric, gas, water utilities. Defensive, bond-like. Suffers when rates rise.',
  },
  XLC: {
    category: 'sector',
    name: 'Comm Svcs',
    description: 'Communication Services Select Sector SPDR',
    detail: 'Meta, Google, Netflix, telecom. Mix of growth tech and defensive telecom.',
  },

  // Benchmarks
  SPY: {
    category: 'benchmarks',
    name: 'S&P 500',
    description: 'SPDR S&P 500 ETF Trust',
    detail: 'Tracks 500 largest US companies. The benchmark for US equity market performance.',
  },

  // Economic Indicators (via Alpha Vantage economic API)
  CPI: {
    category: 'economic',
    name: 'CPI',
    description: 'Consumer Price Index',
    detail: 'Measures inflation by tracking prices of goods and services. Fed\'s key inflation gauge.',
  },
  UNEMPLOYMENT: {
    category: 'economic',
    name: 'Unemployment',
    description: 'US Unemployment Rate',
    detail: 'Percentage of labor force without jobs. Key indicator of labor market health.',
  },
} as const satisfies Record<string, IndicatorConfig>

export type IndicatorSymbol = keyof typeof INDICATORS


/** Economic indicator symbols that use Alpha Vantage economic API */
const ECONOMIC_SYMBOLS = ['US10Y', 'US02Y', 'FED_FUNDS', 'CPI', 'UNEMPLOYMENT'] as const

/**
 * Get all ETF symbols (for Alpha Vantage stock API)
 */
export function getETFSymbols(): IndicatorSymbol[] {
  return (Object.keys(INDICATORS) as IndicatorSymbol[]).filter(
    (symbol) => !(ECONOMIC_SYMBOLS as readonly string[]).includes(symbol)
  )
}

/**
 * Get all economic indicator symbols (for Alpha Vantage economic API)
 */
export function getEconomicSymbols(): IndicatorSymbol[] {
  return [...ECONOMIC_SYMBOLS] as IndicatorSymbol[]
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

