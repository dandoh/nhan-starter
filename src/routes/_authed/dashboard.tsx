import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import dayjs from 'dayjs'
import {
  TopNav,
  AppPageWrapper,
  AppPageContentWrapper,
} from '@/components/app-page-wrapper'
import { orpcQuery } from '@/orpc/client'
import { PriceChart } from '@/components/dashboard/price-chart'
import { ChartGridSection } from '@/components/dashboard/chart-grid-section'
import { ALL_SYMBOLS, INDICATORS, type IndicatorSymbol } from '@/config/indicators'
import { Skeleton } from '@/components/ui/skeleton'

// Group symbols into Macro vs Sectors
const MACRO_SYMBOLS = ALL_SYMBOLS.filter(
  (symbol) => INDICATORS[symbol].category !== 'sector'
)
const SECTOR_SYMBOLS = ALL_SYMBOLS.filter(
  (symbol) => INDICATORS[symbol].category === 'sector'
)

export const Route = createFileRoute('/_authed/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  // Fetch latest dashboard data
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery(
    orpcQuery.market.getDashboardData.queryOptions({ input: {} })
  )

  // Fetch all available historical data for all symbols
  const historyQueries = ALL_SYMBOLS.map((symbol) =>
    useQuery({
      ...orpcQuery.market.getIndicatorHistory.queryOptions({
        input: { symbol },
      }),
      staleTime: 5 * 60 * 1000, // 5 minutes
    })
  )

  // Calculate time bounds from all data
  const timeBounds = useMemo(() => {
    let minTime = Infinity
    let maxTime = -Infinity

    historyQueries.forEach((query) => {
      if (!query.data?.data) return
      query.data.data.forEach((d) => {
        if (d.time < minTime) minTime = d.time
        if (d.time > maxTime) maxTime = d.time
      })
    })

    // Default to 1 year view
    const oneYearAgo = Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60
    const now = Math.floor(Date.now() / 1000)

    return {
      min: minTime === Infinity ? oneYearAgo : minTime,
      max: maxTime === -Infinity ? now : maxTime,
      defaultStart: Math.max(minTime === Infinity ? oneYearAgo : minTime, oneYearAgo),
      defaultEnd: maxTime === -Infinity ? now : maxTime,
    }
  // Only recalculate when loading state changes (not on every render)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyQueries.every((q) => q.isSuccess)])

  const isLoading = dashboardLoading || historyQueries.some((q) => q.isLoading)

  if (isLoading) {
    return (
      <AppPageWrapper>
        <TopNav breadcrumbs={[{ label: 'Dashboard' }]} />
        <AppPageContentWrapper fullWidth>
          <DashboardSkeleton />
        </AppPageContentWrapper>
      </AppPageWrapper>
    )
  }

  if (!dashboardData?.date) {
    return (
      <AppPageWrapper>
        <TopNav breadcrumbs={[{ label: 'Dashboard' }]} />
        <AppPageContentWrapper fullWidth>
          <EmptyState />
        </AppPageContentWrapper>
      </AppPageWrapper>
    )
  }

  // Create maps for data lookup
  const historyMap = new Map<string, typeof historyQueries[0]['data']>()
  historyQueries.forEach((query, index) => {
    if (query.data) {
      historyMap.set(ALL_SYMBOLS[index], query.data)
    }
  })

  // Map of symbol to latest indicator data
  const latestMap = new Map<string, typeof dashboardData.indicators[0]>()
  dashboardData.indicators.forEach((indicator) => {
    latestMap.set(indicator.symbol, indicator)
  })

  // Helper to render a chart for a symbol with synced range
  const renderChart = (symbol: IndicatorSymbol, syncedRange: { start: number; end: number }) => {
    const history = historyMap.get(symbol)
    const latest = latestMap.get(symbol)
    if (!history) return null

    return (
      <PriceChart
        key={symbol}
        data={history.data}
        symbol={symbol}
        displayName={history.displayName}
        height={200}
        latestValue={latest?.close}
        change1d={latest?.change1d}
        change1w={latest?.change1w}
        change1m={latest?.change1m}
        syncedRange={syncedRange}
      />
    )
  }

  return (
    <AppPageWrapper>
      <TopNav breadcrumbs={[{ label: 'Dashboard' }]} />
      <AppPageContentWrapper fullWidth>
        <div className="space-y-8">
          {/* Page Header */}
          <div>
            <h1 className="text-2xl font-bold">Market Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Last updated: {dayjs(dashboardData.date).format('dddd, MMMM D, YYYY')}
            </p>
          </div>

          <ChartGridSection
            title="Macro Indicators"
            symbols={MACRO_SYMBOLS}
            minTime={timeBounds.min}
            maxTime={timeBounds.max}
            defaultStart={timeBounds.defaultStart}
            defaultEnd={timeBounds.defaultEnd}
            renderChart={renderChart}
          />

          <ChartGridSection
            title="Sector Performance"
            symbols={SECTOR_SYMBOLS}
            minTime={timeBounds.min}
            maxTime={timeBounds.max}
            defaultStart={timeBounds.defaultStart}
            defaultEnd={timeBounds.defaultEnd}
            renderChart={renderChart}
          />
        </div>
      </AppPageContentWrapper>
    </AppPageWrapper>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <section>
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-[280px]" />
          ))}
        </div>
      </section>
      <section>
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-[280px]" />
          ))}
        </div>
      </section>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="text-muted-foreground text-center">
        <p className="text-lg font-medium">No market data available</p>
        <p className="text-sm mt-1">Run the fetch script to populate data:</p>
        <code className="mt-2 block bg-muted px-3 py-2 rounded text-sm">
          pnpm tsx src/scripts/fetch-market-data.ts
        </code>
      </div>
    </div>
  )
}
