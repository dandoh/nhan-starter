/**
 * Market data ORPC routes
 */
import { os } from '@orpc/server'
import * as z from 'zod'
import dayjs from 'dayjs'
import { db } from '@/db'
import { marketSnapshots } from '@/db/schema'
import { desc, inArray } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth'
import {
  INDICATORS,
  getDisplayName,
  type IndicatorSymbol,
} from '@/config/indicators'
import { getStaleSymbols, fetchAndStoreSymbol } from '@/services/market-data'

/**
 * Get the latest date with data available
 */
export const getLatestDate = os
  .use(authMiddleware)
  .input(z.object({}).optional())
  .handler(async () => {
    const latest = await db
      .select({ date: marketSnapshots.date })
      .from(marketSnapshots)
      .orderBy(desc(marketSnapshots.date))
      .limit(1)

    return {
      date: latest.length ? latest[0].date : null,
    }
  })

/**
 * Parse a symbol string - returns ratio parts if it's a ratio (e.g., "SPY/TLT")
 */
function parseSymbol(symbol: string): { isRatio: boolean; numerator: string; denominator?: string } {
  if (symbol.includes('/')) {
    const [numerator, denominator] = symbol.split('/')
    return { isRatio: true, numerator: numerator.trim(), denominator: denominator.trim() }
  }
  return { isRatio: false, numerator: symbol }
}

/**
 * Get historical data for multiple symbols
 * Used for chart grids - returns full OHLCV data for requested symbols
 * Automatically fetches stale or missing data from Alpha Vantage
 * 
 * Supports ratio symbols like "SPY/TLT" which computes the ratio of two symbols
 */
export const getSymbolsHistory = os
  .use(authMiddleware)
  .input(
    z.object({
      symbols: z.array(z.string()),
    }),
  )
  .handler(async ({ input }) => {
    const { symbols } = input

    // Parse symbols to identify ratios and collect all base symbols needed
    const parsedSymbols = symbols.map((s) => ({ original: s, ...parseSymbol(s) }))
    const baseSymbols = new Set<string>()
    for (const parsed of parsedSymbols) {
      baseSymbols.add(parsed.numerator)
      if (parsed.denominator) baseSymbols.add(parsed.denominator)
    }
    const baseSymbolsArray = Array.from(baseSymbols)

    // Check for stale symbols and fetch them before querying
    const staleSymbols = await getStaleSymbols(baseSymbolsArray as IndicatorSymbol[])
    if (staleSymbols.length > 0) {
      console.log(`[market] Fetching stale symbols: ${staleSymbols.join(', ')}`)
      for (const symbol of staleSymbols) {
        await fetchAndStoreSymbol(symbol)
      }
    }

    // Fetch all available history for the base symbols
    const history = await db
      .select()
      .from(marketSnapshots)
      .where(inArray(marketSnapshots.symbol, baseSymbolsArray))
      .orderBy(marketSnapshots.date)

    // Group by symbol
    const bySymbol: Record<string, typeof history> = {}
    for (const row of history) {
      if (!bySymbol[row.symbol]) {
        bySymbol[row.symbol] = []
      }
      bySymbol[row.symbol].push(row)
    }

    // Build results for each requested symbol (including ratios)
    const items = parsedSymbols.map((parsed) => {
      if (parsed.isRatio && parsed.denominator) {
        // Compute ratio between two symbols
        const numeratorData = bySymbol[parsed.numerator] || []
        const denominatorData = bySymbol[parsed.denominator] || []

        // Create lookup maps by date
        const numByDate = new Map(numeratorData.map((r) => [r.date, r]))
        const denByDate = new Map(denominatorData.map((r) => [r.date, r]))

        // Find all dates where both have data
        const commonDates = Array.from(numByDate.keys()).filter((date) => denByDate.has(date))
        commonDates.sort()

        const ratioHistory = commonDates.map((date) => {
          const num = numByDate.get(date)!
          const den = denByDate.get(date)!
          const numClose = num.close ? parseFloat(num.close) : null
          const denClose = den.close ? parseFloat(den.close) : null
          const ratio = numClose && denClose ? numClose / denClose : null

          return {
            date,
            time: dayjs(date).unix(),
            open: null,
            high: null,
            low: null,
            close: ratio,
            value: ratio,
            volume: null,
          }
        })

        const latestRatio = ratioHistory[ratioHistory.length - 1]
        const numConfig = INDICATORS[parsed.numerator as IndicatorSymbol]
        const denConfig = INDICATORS[parsed.denominator as IndicatorSymbol]

        return {
          symbol: parsed.original,
          displayName: `${numConfig ? getDisplayName(parsed.numerator as IndicatorSymbol) : parsed.numerator} / ${denConfig ? getDisplayName(parsed.denominator as IndicatorSymbol) : parsed.denominator}`,
          description: `Ratio of ${parsed.numerator} to ${parsed.denominator}`,
          detail: `Measures relative performance between ${numConfig?.description || parsed.numerator} and ${denConfig?.description || parsed.denominator}`,
          category: 'ratio' as const,
          history: ratioHistory,
          latest: {
            close: latestRatio?.close ?? null,
          },
        }
      }

      // Regular symbol
      const rows = bySymbol[parsed.numerator] || []
      const config = INDICATORS[parsed.numerator as IndicatorSymbol]
      const latest = rows[rows.length - 1]

      return {
        symbol: parsed.original,
        displayName: config
          ? getDisplayName(parsed.numerator as IndicatorSymbol)
          : parsed.numerator,
        description: config?.description ?? null,
        detail: config?.detail ?? null,
        category: config?.category,
        history: rows.map((h) => ({
          date: h.date,
          time: dayjs(h.date).unix(),
          open: h.open ? parseFloat(h.open) : null,
          high: h.high ? parseFloat(h.high) : null,
          low: h.low ? parseFloat(h.low) : null,
          close: h.close ? parseFloat(h.close) : null,
          value: h.close ? parseFloat(h.close) : null,
          volume: h.volume ? parseFloat(h.volume) : null,
        })),
        latest: {
          close: latest?.close ? parseFloat(latest.close) : null,
        },
      }
    })

    return { items }
  })

/**
 * Get available dates for data navigation
 */
export const getAvailableDates = os
  .use(authMiddleware)
  .input(z.object({}).optional())
  .handler(async () => {
    const dates = await db
      .selectDistinct({ date: marketSnapshots.date })
      .from(marketSnapshots)
      .orderBy(desc(marketSnapshots.date))
      .limit(365) // Last year of dates

    return {
      dates: dates.map((d) => d.date), // Already strings
    }
  })

export default {
  getLatestDate,
  getSymbolsHistory,
  getAvailableDates,
}
