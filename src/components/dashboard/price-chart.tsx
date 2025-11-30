'use client'

import { useEffect, useRef, useMemo } from 'react'
import dayjs from 'dayjs'
import {
  createChart,
  ColorType,
  LineStyle,
  AreaSeries,
  type IChartApi,
  type UTCTimestamp,
} from 'lightweight-charts'

export interface ChartDataPoint {
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
  description?: string | null
  detail?: string | null
  height?: number
  latestValue?: number | null
  syncedRange?: { start: number; end: number } | null
  onRangeChange?: (start: number, end: number) => void
}

function formatValue(value: number | null | undefined): string {
  if (value == null) return '—'
  if (value >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (value >= 1) return value.toFixed(2)
  return value.toFixed(4)
}

export function PriceChart({
  data,
  symbol,
  displayName,
  description,
  detail,
  height = 300,
  latestValue,
  syncedRange,
  onRangeChange,
}: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const isUpdatingFromSyncRef = useRef(false)
  const onRangeChangeRef = useRef(onRangeChange)
  
  // Keep ref updated
  useEffect(() => {
    onRangeChangeRef.current = onRangeChange
  }, [onRangeChange])

  // Update visible range when syncedRange changes
  useEffect(() => {
    if (!chartRef.current || !syncedRange) return
    
    // Mark that we're updating from sync to avoid feedback loop
    isUpdatingFromSyncRef.current = true
    chartRef.current.timeScale().setVisibleRange({
      from: syncedRange.start as UTCTimestamp,
      to: syncedRange.end as UTCTimestamp,
    })
    // Reset flag after a short delay
    requestAnimationFrame(() => {
      isUpdatingFromSyncRef.current = false
    })
  }, [syncedRange])

  // Derive latest value from data if not provided
  const derivedLatestValue = useMemo(() => {
    if (latestValue != null) return latestValue
    if (data.length === 0) return null
    const sorted = [...data].sort((a, b) => b.time - a.time)
    return sorted[0]?.value ?? null
  }, [data, latestValue])

  // Calculate percentage change for the visible range
  const rangeChange = useMemo(() => {
    if (!syncedRange || data.length === 0) return null

    // Sort data by time
    const sortedData = [...data]
      .filter((d) => d.value !== null)
      .sort((a, b) => a.time - b.time)

    if (sortedData.length === 0) return null

    // Find the closest data point at or after the start of the range
    let startPoint = sortedData.find((d) => d.time >= syncedRange.start)
    // If no point at or after start, use the first available point
    if (!startPoint) startPoint = sortedData[0]

    // Find the closest data point at or before the end of the range
    let endPoint = [...sortedData].reverse().find((d) => d.time <= syncedRange.end)
    // If no point at or before end, use the last available point
    if (!endPoint) endPoint = sortedData[sortedData.length - 1]

    if (!startPoint || !endPoint || startPoint.value === null || endPoint.value === null) {
      return null
    }

    const startValue = startPoint.value
    const endValue = endPoint.value

    if (startValue === 0) return null

    const percentChange = ((endValue - startValue) / startValue) * 100

    return {
      startValue,
      endValue,
      percentChange,
      startTime: startPoint.time,
      endTime: endPoint.time,
    }
  }, [data, syncedRange])

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

    // Create chart with disabled default mouse wheel zoom (we handle it manually)
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
      handleScale: {
        mouseWheel: false, // Disable default wheel zoom - we handle it with Cmd modifier
      },
      handleScroll: {
        mouseWheel: false, // Disable default wheel scroll
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

    // Subscribe to visible range changes from user interaction (debounced)
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const handleVisibleRangeChange = () => {
      if (isUpdatingFromSyncRef.current) return
      
      // Debounce to avoid flooding with updates during scroll
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        const visibleRange = chart.timeScale().getVisibleRange()
        if (visibleRange && onRangeChangeRef.current) {
          onRangeChangeRef.current(visibleRange.from as number, visibleRange.to as number)
        }
      }, 50)
    }
    
    chart.timeScale().subscribeVisibleTimeRangeChange(handleVisibleRangeChange)

    // Set initial visible range to 1 year (user can zoom out to see 5 years)
    const oneYearAgo = Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60
    const now = Math.floor(Date.now() / 1000)
    chart.timeScale().setVisibleRange({
      from: oneYearAgo as UTCTimestamp,
      to: now as UTCTimestamp,
    })

    // Custom wheel handler - only zoom when Cmd (Mac) or Ctrl (Windows) is pressed
    const container = chartContainerRef.current
    const handleWheel = (e: WheelEvent) => {
      const hasModifier = e.metaKey || e.ctrlKey
      
      if (!hasModifier) {
        // Let the event propagate for normal page scrolling
        return
      }
      
      // Prevent default and stop propagation when modifier is pressed
      e.preventDefault()
      e.stopPropagation()
      
      const timeScale = chart.timeScale()
      const visibleRange = timeScale.getVisibleLogicalRange()
      if (!visibleRange) return
      
      // Calculate zoom factor based on scroll delta
      // Normalize delta across different browsers/devices
      const delta = e.deltaY
      const zoomFactor = delta > 0 ? 1.1 : 0.9 // Zoom out or in
      
      const rangeLength = visibleRange.to - visibleRange.from
      const newLength = rangeLength * zoomFactor
      
      // Calculate mouse position as percentage across the chart
      const rect = container.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mousePercent = mouseX / rect.width
      
      // Zoom centered on mouse position
      const rangeStart = visibleRange.from
      const rangeEnd = visibleRange.to
      const mouseLogical = rangeStart + (rangeEnd - rangeStart) * mousePercent
      
      const newFrom = mouseLogical - newLength * mousePercent
      const newTo = mouseLogical + newLength * (1 - mousePercent)
      
      timeScale.setVisibleLogicalRange({ from: newFrom, to: newTo })
    }
    
    container.addEventListener('wheel', handleWheel, { passive: false })

    // Handle resize using ResizeObserver to detect container size changes (e.g., grid column changes)
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width
        if (width > 0) {
          chart.applyOptions({ width })
        }
      }
    })
    resizeObserver.observe(container)

    return () => {
      container.removeEventListener('wheel', handleWheel)
      resizeObserver.disconnect()
      if (debounceTimer) clearTimeout(debounceTimer)
      chart.timeScale().unsubscribeVisibleTimeRangeChange(handleVisibleRangeChange)
      chart.remove()
      chartRef.current = null
    }
  }, [data, height])

  if (data.length === 0) {
    return (
      <div className="flex flex-col rounded-xl border bg-card/50 text-card-foreground">
        <div className="flex flex-col space-y-0.5 p-4 pb-2">
          <h3 className="font-semibold leading-none tracking-tight text-sm">{displayName}</h3>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="font-medium">{symbol}</span>
            {description && (
              <>
                <span>·</span>
                <span className="truncate">{description}</span>
              </>
            )}
          </div>
          {detail && (
            <p className="text-[10px] text-muted-foreground/70 line-clamp-2 leading-relaxed pt-1">
              {detail}
            </p>
          )}
        </div>
        <div className="flex items-center justify-center p-6 pt-0" style={{ height }}>
          <p className="text-sm text-muted-foreground">No data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col rounded-xl border bg-card/50 text-card-foreground">
      <div className="flex flex-col space-y-0.5 p-4 pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col min-w-0">
            <h3 className="font-semibold leading-none tracking-tight text-sm truncate" title={displayName}>
              {displayName}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
              <span className="font-medium shrink-0">{symbol}</span>
              {description && (
                <>
                  <span>·</span>
                  <span className="truncate" title={description}>{description}</span>
                </>
              )}
            </div>
          </div>

          <span className="text-base font-semibold tabular-nums leading-none shrink-0">
            {formatValue(derivedLatestValue)}
          </span>
        </div>
        {detail && (
          <p className="text-[10px] text-muted-foreground/70 line-clamp-2 leading-relaxed">
            {detail}
          </p>
        )}
      </div>
      <div className="p-0 pr-2">
        <div ref={chartContainerRef} style={{ height }} />
      </div>
      {rangeChange && (
        <div className="flex items-center justify-end gap-3 px-4 py-2 border-t border-border/50 text-xs tabular-nums">
          <span className="text-muted-foreground/50">
            {dayjs(rangeChange.startTime * 1000).format("MMM D 'YY")} –{' '}
            {dayjs(rangeChange.endTime * 1000).format("MMM D 'YY")}
          </span>
          <span className="text-muted-foreground/70">
            {formatValue(rangeChange.startValue)} → {formatValue(rangeChange.endValue)}
          </span>
          <span
            className={`font-semibold ${
              rangeChange.percentChange >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
            }`}
          >
            {rangeChange.percentChange >= 0 ? '+' : ''}
            {rangeChange.percentChange.toFixed(2)}%
          </span>
        </div>
      )}
    </div>
  )
}
