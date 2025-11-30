import { useMemo } from 'react'
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
import { Skeleton } from '@/components/ui/skeleton'

interface CompareSearch {
  symbols: string
}

export const Route = createFileRoute('/_authed/dashboard/compare')({
  validateSearch: (search: Record<string, unknown>): CompareSearch => {
    return {
      symbols: (search.symbols as string) || '',
    }
  },
  component: ComparePage,
})

function ComparePage() {
  const { symbols: symbolsParam } = Route.useSearch()

  // Parse symbols from search params
  const symbols = useMemo(() => {
    if (!symbolsParam) return []
    return symbolsParam
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0)
  }, [symbolsParam])

  const { data: latestData, isLoading } = useQuery(
    orpcQuery.market.getLatestDate.queryOptions({ input: {} })
  )

  if (symbols.length === 0) {
    return (
      <AppPageWrapper>
        <TopNav
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Compare' },
          ]}
        />
        <AppPageContentWrapper fullWidth>
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-lg text-muted-foreground">
              No symbols to compare. Press{' '}
              <kbd className="bg-muted text-muted-foreground pointer-events-none inline-flex h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium">
                <span className="text-xs">⌘</span>K
              </kbd>{' '}
              to search for symbols.
            </p>
          </div>
        </AppPageContentWrapper>
      </AppPageWrapper>
    )
  }

  if (isLoading) {
    return (
      <AppPageWrapper>
        <TopNav
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Compare' },
          ]}
        />
        <AppPageContentWrapper fullWidth>
          <CompareSkeleton symbolCount={symbols.length} />
        </AppPageContentWrapper>
      </AppPageWrapper>
    )
  }

  return (
    <AppPageWrapper>
      <TopNav
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Compare' },
        ]}
      />
      <AppPageContentWrapper fullWidth>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Compare Symbols</h1>
            {latestData?.date && (
              <p className="text-sm text-muted-foreground">
                Last updated: {dayjs(latestData.date).format('dddd, MMMM D, YYYY')}
              </p>
            )}
          </div>

          <ChartGridSection title="" symbols={symbols} />
        </div>
      </AppPageContentWrapper>
    </AppPageWrapper>
  )
}

function CompareSkeleton({ symbolCount }: { symbolCount: number }) {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: symbolCount }).map((_, i) => (
          <Skeleton key={i} className="h-[280px]" />
        ))}
      </div>
    </div>
  )
}

