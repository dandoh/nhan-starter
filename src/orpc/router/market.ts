/**
 * Market data ORPC routes
 */
import { os } from '@orpc/server'
import * as z from 'zod'
import dayjs from 'dayjs'
import { db } from '@/db'
import { marketSnapshots } from '@/db/schema'
import { eq, desc, and, gte, lte, inArray } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth'
import {
  INDICATORS,
  getSymbolsByCategory,
  getDisplayName,
  type IndicatorSymbol,
  type IndicatorCategory,
  INDICATOR_CATEGORIES,
} from '@/config/indicators'

// Date format used throughout the app
const DATE_FORMAT = 'YYYY-MM-DD'

/**
 * Get dashboard data for a specific date (or latest)
 * Returns all indicators grouped by category
 */
export const getDashboardData = os
  .use(authMiddleware)
  .input(
    z.object({
      date: z.string().optional(), // YYYY-MM-DD, defaults to latest
    })
  )
  .handler(async ({ input }) => {
    // Get the target date - either specified or the most recent data point
    let targetDate: string

    if (!input.date) {
      const latest = await db
        .select({ date: marketSnapshots.date })
        .from(marketSnapshots)
        .orderBy(desc(marketSnapshots.date))
        .limit(1)

      if (!latest.length) {
        return { date: null, categories: {}, indicators: [] }
      }

      targetDate = latest[0].date // Already a string with mode: 'string'
    } else {
      targetDate = input.date
    }

    // Fetch all snapshots for the target date (simple string comparison now!)
    const snapshots = await db
      .select()
      .from(marketSnapshots)
      .where(eq(marketSnapshots.date, targetDate))

    // Group by category
    const categories: Record<string, typeof snapshots> = {}

    for (const category of Object.keys(INDICATOR_CATEGORIES) as IndicatorCategory[]) {
      const symbols = getSymbolsByCategory(category)
      categories[category] = snapshots.filter((s) =>
        symbols.includes(s.symbol as IndicatorSymbol)
      )
    }

    // Helper to safely get display name
    const safeGetDisplayName = (symbol: string): string => {
      const config = INDICATORS[symbol as IndicatorSymbol]
      return config?.name || symbol
    }

    // Helper to parse snapshot data
    const parseSnapshot = (s: typeof snapshots[0]) => ({
      ...s,
      displayName: safeGetDisplayName(s.symbol),
      category: INDICATORS[s.symbol as IndicatorSymbol]?.category,
      open: s.open ? parseFloat(s.open) : null,
      high: s.high ? parseFloat(s.high) : null,
      low: s.low ? parseFloat(s.low) : null,
      close: s.close ? parseFloat(s.close) : null,
      adjustedClose: s.adjustedClose ? parseFloat(s.adjustedClose) : null,
      volume: s.volume ? parseFloat(s.volume) : null,
      change1d: s.change1d ? parseFloat(s.change1d) : null,
      change1w: s.change1w ? parseFloat(s.change1w) : null,
      change1m: s.change1m ? parseFloat(s.change1m) : null,
    })

    const indicators = snapshots.map(parseSnapshot)

    return {
      date: targetDate,
      categories: Object.fromEntries(
        Object.entries(categories).map(([cat, snaps]) => [
          cat,
          snaps.map(parseSnapshot),
        ])
      ),
      indicators,
    }
  })

/**
 * Get historical data for a specific indicator
 * Used for charts - returns full OHLCV data (all available history)
 */
export const getIndicatorHistory = os
  .use(authMiddleware)
  .input(
    z.object({
      symbol: z.string(),
    })
  )
  .handler(async ({ input }) => {
    const { symbol } = input

    // Fetch all available history for the symbol
    const history = await db
      .select()
      .from(marketSnapshots)
      .where(eq(marketSnapshots.symbol, symbol))
      .orderBy(marketSnapshots.date)

    const config = INDICATORS[symbol as IndicatorSymbol]

    return {
      symbol,
      displayName: config ? getDisplayName(symbol as IndicatorSymbol) : symbol,
      category: config?.category,
      data: history.map((h) => ({
        date: h.date,
        time: dayjs(h.date).unix(), // Unix timestamp for TradingView charts
        open: h.open ? parseFloat(h.open) : null,
        high: h.high ? parseFloat(h.high) : null,
        low: h.low ? parseFloat(h.low) : null,
        close: h.close ? parseFloat(h.close) : null,
        value: h.close ? parseFloat(h.close) : null, // Alias for line charts
        volume: h.volume ? parseFloat(h.volume) : null,
      })),
    }
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

/**
 * Get sector comparison data
 * Returns all sector ETFs for a date range for comparison charts
 */
export const getSectorComparison = os
  .use(authMiddleware)
  .input(
    z.object({
      days: z.number().optional().default(30),
    })
  )
  .handler(async ({ input }) => {
    const sectorSymbols = getSymbolsByCategory('sector')

    // Calculate date range using dayjs
    const endDate = dayjs().format(DATE_FORMAT)
    const startDate = dayjs().subtract(input.days, 'day').format(DATE_FORMAT)

    const data = await db
      .select()
      .from(marketSnapshots)
      .where(
        and(
          inArray(marketSnapshots.symbol, sectorSymbols),
          gte(marketSnapshots.date, startDate),
          lte(marketSnapshots.date, endDate)
        )
      )
      .orderBy(marketSnapshots.date)

    // Group by symbol
    const bySymbol: Record<string, typeof data> = {}
    for (const row of data) {
      if (!bySymbol[row.symbol]) {
        bySymbol[row.symbol] = []
      }
      bySymbol[row.symbol].push(row)
    }

    return {
      sectors: Object.entries(bySymbol).map(([symbol, history]) => ({
        symbol,
        displayName: getDisplayName(symbol as IndicatorSymbol),
        data: history.map((h) => ({
          date: h.date,
          close: h.close ? parseFloat(h.close) : null,
          change1d: h.change1d ? parseFloat(h.change1d) : null,
        })),
      })),
    }
  })


export default {
  getDashboardData,
  getIndicatorHistory,
  getAvailableDates,
  getSectorComparison,
}

