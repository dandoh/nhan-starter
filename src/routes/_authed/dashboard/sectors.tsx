import { useState, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import {
  TopNav,
  AppPageWrapper,
  AppPageContentWrapper,
} from '@/components/app-page-wrapper'
import { orpcQuery } from '@/orpc/client'
import { ChartGridSection } from '@/components/dashboard/chart-grid-section'
import { ALL_SYMBOLS, INDICATORS } from '@/config/indicators'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

// Get all sector symbols
const SECTOR_SYMBOLS = ALL_SYMBOLS.filter(
  (symbol) => INDICATORS[symbol].category === 'sector'
)

export const Route = createFileRoute('/_authed/dashboard/sectors')({
  component: SectorsPage,
})

function SectorsPage() {
  const [relativeToSPY, setRelativeToSPY] = useState(false)

  const { data: latestData, isLoading } = useQuery(
    orpcQuery.market.getLatestDate.queryOptions({ input: {} })
  )

  // Transform symbols to ratios when relative mode is enabled
  const displaySymbols = useMemo(() => {
    if (relativeToSPY) {
      return SECTOR_SYMBOLS.map((symbol) => `${symbol}/SPY`)
    }
    return SECTOR_SYMBOLS
  }, [relativeToSPY])

  if (isLoading) {
    return (
      <AppPageWrapper>
        <TopNav
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Sectors' },
          ]}
        />
        <AppPageContentWrapper fullWidth>
          <SectorsSkeleton />
        </AppPageContentWrapper>
      </AppPageWrapper>
    )
  }

  return (
    <AppPageWrapper>
      <TopNav
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Sectors' },
        ]}
      />
      <AppPageContentWrapper fullWidth>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Sector Performance</h1>
            {latestData?.date && (
              <p className="text-sm text-muted-foreground">
                Last updated: {dayjs(latestData.date).format('dddd, MMMM D, YYYY')}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="relative-mode"
              checked={relativeToSPY}
              onCheckedChange={setRelativeToSPY}
            />
            <Label htmlFor="relative-mode" className="text-sm cursor-pointer">
              Relative to S&P 500
            </Label>
          </div>

          <ChartGridSection key={relativeToSPY ? 'relative' : 'absolute'} title="" symbols={displaySymbols} />
        </div>
      </AppPageContentWrapper>
    </AppPageWrapper>
  )
}

function SectorsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 11 }).map((_, i) => (
          <Skeleton key={i} className="h-[280px]" />
        ))}
      </div>
    </div>
  )
}

