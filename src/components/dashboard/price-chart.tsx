'use client'

import { useEffect, useRef, useMemo } from 'react'
import {
  createChart,
  ColorType,
  LineStyle,
  AreaSeries,
  type IChartApi,
  type UTCTimestamp,
} from 'lightweight-charts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ChartDataPoint {
  time: number // Unix timestamp
  open: number | null
  high: number | null
  low: number | null
  close: number | null
  value: number | null
  volume: number | null
}

interface PriceChartProps {
  data: ChartDataPoint[]
  symbol: string
  displayName: string
  height?: number
  latestValue?: number | null
  change1d?: number | null
  change1w?: number | null
  change1m?: number | null
  syncedRange?: { start: number; end: number } | null
}

function formatValue(value: number | null | undefined): string {
  if (value == null) return '—'
  if (value >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (value >= 1) return value.toFixed(2)
  return value.toFixed(4)
}

function formatChange(change: number | null | undefined): string {
  if (change == null) return '—'
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(2)}%`
}

export function PriceChart({
  data,
  symbol,
  displayName,
  height = 300,
  latestValue,
  change1d,
  change1w,
  change1m,
  syncedRange,
}: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)

  // Update visible range when syncedRange changes
  useEffect(() => {
    if (!chartRef.current || !syncedRange) return
    
    chartRef.current.timeScale().setVisibleRange({
      from: syncedRange.start as UTCTimestamp,
      to: syncedRange.end as UTCTimestamp,
    })
  }, [syncedRange])

  // Derive latest value from data if not provided
  const derivedLatestValue = useMemo(() => {
    if (latestValue != null) return latestValue
    if (data.length === 0) return null
    const sorted = [...data].sort((a, b) => b.time - a.time)
    return sorted[0]?.value ?? null
  }, [data, latestValue])

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return

    // Filter valid data points and cast time to UTCTimestamp
    const validData = data
      .filter((d) => d.time && d.value !== null)
      .map((d) => ({
        time: d.time as UTCTimestamp,
        value: d.value as number,
      }))
      .sort((a, b) => (a.time as number) - (b.time as number))

    if (validData.length === 0) return

    // Get theme colors
    const isDark = document.documentElement.classList.contains('dark')
    const textColor = isDark ? '#a1a1aa' : '#71717a'
    const borderColor = isDark ? 'rgba(63, 63, 70, 0.5)' : 'rgba(228, 228, 231, 0.5)'
    const chartColor = '#6366f1' // Indigo for the chart line

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor,
        fontFamily: 'inherit',
      },
      grid: {
        vertLines: { color: borderColor, style: LineStyle.Dotted },
        horzLines: { color: borderColor, style: LineStyle.Dotted },
      },
      width: chartContainerRef.current.clientWidth,
      height,
      rightPriceScale: {
        borderColor: borderColor,
      },
      timeScale: {
        borderColor: borderColor,
        timeVisible: true,
        secondsVisible: false,
        minBarSpacing: 0.001, // Allow extreme zoom out
      },
      crosshair: {
        vertLine: {
          color: textColor,
          labelBackgroundColor: isDark ? '#27272a' : '#f4f4f5',
        },
        horzLine: {
          color: textColor,
          labelBackgroundColor: isDark ? '#27272a' : '#f4f4f5',
        },
      },
    })

    chartRef.current = chart

    // Add area series (with line on top)
    const areaSeries = chart.addSeries(AreaSeries, {
      topColor: 'rgba(99, 102, 241, 0.3)',
      bottomColor: 'rgba(99, 102, 241, 0.05)',
      lineColor: chartColor,
      lineWidth: 2,
    })

    areaSeries.setData(validData)

    // Set initial visible range to 1 year (user can zoom out to see 5 years)
    const oneYearAgo = Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60
    const now = Math.floor(Date.now() / 1000)
    chart.timeScale().setVisibleRange({
      from: oneYearAgo as UTCTimestamp,
      to: now as UTCTimestamp,
    })

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
      chartRef.current = null
    }
  }, [data, height])

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{displayName}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center" style={{ height }}>
          <p className="text-sm text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-medium">
              {displayName}
              <span className="ml-2 text-xs text-muted-foreground font-normal">{symbol}</span>
            </CardTitle>
            <div className="mt-1 text-2xl font-bold tabular-nums">
              {formatValue(derivedLatestValue)}
            </div>
          </div>
          <div className="flex gap-3 text-xs">
            <div className="text-right">
              <div className="text-muted-foreground">1D</div>
              <div className={cn('font-medium tabular-nums', change1d != null && (change1d >= 0 ? 'text-emerald-500' : 'text-red-500'))}>
                {formatChange(change1d)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-muted-foreground">1W</div>
              <div className={cn('font-medium tabular-nums', change1w != null && (change1w >= 0 ? 'text-emerald-500' : 'text-red-500'))}>
                {formatChange(change1w)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-muted-foreground">1M</div>
              <div className={cn('font-medium tabular-nums', change1m != null && (change1m >= 0 ? 'text-emerald-500' : 'text-red-500'))}>
                {formatChange(change1m)}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 pr-2">
        <div ref={chartContainerRef} style={{ height }} />
      </CardContent>
    </Card>
  )
}

