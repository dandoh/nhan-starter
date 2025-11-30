'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RangeSelector } from './range-selector'
import { PriceChart, type ChartDataPoint } from './price-chart'
import { orpcQuery } from '@/orpc/client'
import { Skeleton } from '@/components/ui/skeleton'
import { type IndicatorSymbol } from '@/config/indicators'

interface ChartGridSectionProps {
  title: string
  symbols: IndicatorSymbol[]
}

export function ChartGridSection({
  title,
  symbols,
}: ChartGridSectionProps) {
  // Fetch data for symbols
  const { data: queryData, isLoading } = useQuery({
    ...orpcQuery.market.getSymbolsHistory.queryOptions({
      input: { symbols },
    }),
  })

  const data = queryData?.items || []

  // Calculate time bounds from data
  const { minTime, maxTime, defaultStart, defaultEnd } = useMemo(() => {
    let min = Infinity
    let max = -Infinity

    data.forEach((item) => {
      item.history.forEach((d) => {
        if (d.time < min) min = d.time
        if (d.time > max) max = d.time
      })
    })

    // If no data, return defaults
    if (min === Infinity || max === -Infinity) {
      const now = Math.floor(Date.now() / 1000)
      return {
        minTime: now - 365 * 24 * 60 * 60,
        maxTime: now,
        defaultStart: now - 365 * 24 * 60 * 60,
        defaultEnd: now,
      }
    }

    // Default to 1 year view or full range if shorter
    const now = Math.floor(Date.now() / 1000)
    const oneYearAgo = now - 365 * 24 * 60 * 60
    const start = Math.max(min, oneYearAgo)

    return {
      minTime: min,
      maxTime: max,
      defaultStart: start,
      defaultEnd: max,
    }
  }, [data])

  const [range, setRange] = useState({ start: defaultStart, end: defaultEnd })

  // Memoized callback to prevent unnecessary re-renders
  const handleRangeChange = useCallback((start: number, end: number) => {
    setRange({ start, end })
  }, [])

  // Update range when bounds change (e.g. data loads)
  useEffect(() => {
    setRange({ start: defaultStart, end: defaultEnd })
  }, [defaultStart, defaultEnd])

  if (isLoading) {
    return (
      <section>
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
        )}
        <Skeleton className="h-12 mb-4 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {symbols.map((s) => (
            <Skeleton key={s} className="h-[200px]" />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section>
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
      )}
      
      <RangeSelector
        minTime={minTime}
        maxTime={maxTime}
        startTime={range.start}
        endTime={range.end}
        onRangeChange={handleRangeChange}
        className="mb-4"
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.map((item) => (
          <PriceChart
            key={item.symbol}
            data={item.history as ChartDataPoint[]}
            symbol={item.symbol}
            displayName={item.displayName}
            description={item.description}
            detail={item.detail}
            height={200}
            latestValue={item.latest.close}
            syncedRange={range}
            onRangeChange={handleRangeChange}
          />
        ))}
      </div>
    </section>
  )
}

