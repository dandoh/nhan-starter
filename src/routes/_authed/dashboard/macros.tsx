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

// Get all non-sector symbols (macro indicators)
const MACRO_SYMBOLS = ALL_SYMBOLS.filter(
  (symbol) => INDICATORS[symbol].category !== 'sector'
)

export const Route = createFileRoute('/_authed/dashboard/macros')({
  component: MacrosPage,
})

function MacrosPage() {
  const { data: latestData, isLoading } = useQuery(
    orpcQuery.market.getLatestDate.queryOptions({ input: {} })
  )

  if (isLoading) {
    return (
      <AppPageWrapper>
        <TopNav
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Macros' },
          ]}
        />
        <AppPageContentWrapper fullWidth>
          <MacrosSkeleton />
        </AppPageContentWrapper>
      </AppPageWrapper>
    )
  }

  return (
    <AppPageWrapper>
      <TopNav
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Macros' },
        ]}
      />
      <AppPageContentWrapper fullWidth>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Macro Indicators</h1>
            {latestData?.date && (
              <p className="text-sm text-muted-foreground">
                Last updated: {dayjs(latestData.date).format('dddd, MMMM D, YYYY')}
              </p>
            )}
          </div>

          <ChartGridSection title="" symbols={MACRO_SYMBOLS} />
        </div>
      </AppPageContentWrapper>
    </AppPageWrapper>
  )
}

function MacrosSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-[280px]" />
        ))}
      </div>
    </div>
  )
}

