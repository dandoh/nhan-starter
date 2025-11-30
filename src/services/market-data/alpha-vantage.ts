/**
 * Alpha Vantage API client
 * Documentation: https://www.alphavantage.co/documentation/
 */

import type {
  MarketDataProvider,
  HistoricalQuoteData,
  HistoricalEconomicData,
  QuoteData,
  EconomicIndicatorData,
  EconomicIndicatorFunction,
} from './types'

const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query'

function getApiKey(): string {
  const key = process.env.ALPHA_VANTAGE_API_KEY
  if (!key) {
    throw new Error('ALPHA_VANTAGE_API_KEY environment variable is not set')
  }
  return key
}

interface AlphaVantageTimeSeriesAdjustedResponse {
  'Meta Data': {
    '1. Information': string
    '2. Symbol': string
    '3. Last Refreshed': string
    '4. Output Size': string
    '5. Time Zone': string
  }
  'Time Series (Daily)': {
    [date: string]: {
      '1. open': string
      '2. high': string
      '3. low': string
      '4. close': string
      '5. adjusted close': string
      '6. volume': string
      '7. dividend amount': string
      '8. split coefficient': string
    }
  }
  Note?: string
  Information?: string
}

interface AlphaVantageTreasuryResponse {
  name: string
  interval: string
  unit: string
  data: Array<{
    date: string
    value: string
  }>
  Note?: string
  Information?: string
}

interface AlphaVantageFedFundsResponse {
  name: string
  interval: string
  unit: string
  data: Array<{
    date: string
    value: string
  }>
  Note?: string
  Information?: string
}

function checkRateLimitError(response: unknown): void {
  const res = response as { Note?: string; Information?: string }
  if (res.Note?.includes('call frequency')) {
    throw new Error('Alpha Vantage API rate limit exceeded. Free tier allows 25 requests/day.')
  }
  if (res.Information?.includes('API key')) {
    throw new Error('Invalid Alpha Vantage API key')
  }
}

export class AlphaVantageProvider implements MarketDataProvider {
  name = 'alpha-vantage'

  async fetchHistoricalQuotes(
    symbol: string,
    outputSize: 'compact' | 'full' = 'compact'
  ): Promise<HistoricalQuoteData> {
    const params = new URLSearchParams({
      function: 'TIME_SERIES_DAILY_ADJUSTED',
      symbol,
      outputsize: outputSize,
      apikey: getApiKey(),
    })

    const response = await fetch(`${ALPHA_VANTAGE_BASE_URL}?${params}`)
    const data: AlphaVantageTimeSeriesAdjustedResponse = await response.json()

    checkRateLimitError(data)

    const timeSeries = data['Time Series (Daily)']
    if (!timeSeries) {
      throw new Error(`No data returned for symbol ${symbol}. Response: ${JSON.stringify(data)}`)
    }

    const quotes: QuoteData[] = Object.entries(timeSeries).map(([date, values]) => ({
      symbol,
      date,
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      adjustedClose: parseFloat(values['5. adjusted close']),
      volume: parseInt(values['6. volume'], 10),
    }))

    // Sort by date descending (newest first)
    quotes.sort((a, b) => b.date.localeCompare(a.date))

    return { symbol, data: quotes }
  }

  async fetchEconomicIndicator(
    indicator: EconomicIndicatorFunction,
    maturity?: '3month' | '2year' | '5year' | '10year' | '30year'
  ): Promise<HistoricalEconomicData> {
    const params = new URLSearchParams({
      function: indicator,
      apikey: getApiKey(),
    })

    // Set interval based on indicator type
    if (indicator === 'TREASURY_YIELD' || indicator === 'FEDERAL_FUNDS_RATE') {
      params.set('interval', 'daily')
    } else if (indicator === 'CPI' || indicator === 'UNEMPLOYMENT') {
      params.set('interval', 'monthly')
    }

    if (indicator === 'TREASURY_YIELD' && maturity) {
      params.set('maturity', maturity)
    }

    const response = await fetch(`${ALPHA_VANTAGE_BASE_URL}?${params}`)
    const data: AlphaVantageTreasuryResponse | AlphaVantageFedFundsResponse = await response.json()

    checkRateLimitError(data)

    if (!data.data) {
      throw new Error(`No data returned for ${indicator}. Response: ${JSON.stringify(data)}`)
    }

    // Map to our internal symbol format
    let symbol: string
    switch (indicator) {
      case 'TREASURY_YIELD':
        symbol = maturity === '2year' ? 'US02Y' : maturity === '10year' ? 'US10Y' : `US_${maturity}`
        break
      case 'FEDERAL_FUNDS_RATE':
        symbol = 'FED_FUNDS'
        break
      case 'CPI':
        symbol = 'CPI'
        break
      case 'UNEMPLOYMENT':
        symbol = 'UNEMPLOYMENT'
        break
      default:
        symbol = indicator
    }

    const indicators: EconomicIndicatorData[] = data.data
      .filter((d) => d.value !== '.')
      .map((d) => ({
        symbol,
        date: d.date,
        value: parseFloat(d.value),
      }))

    // Sort by date descending
    indicators.sort((a, b) => b.date.localeCompare(a.date))

    return { symbol, data: indicators }
  }
}

// Singleton instance
export const alphaVantage = new AlphaVantageProvider()

