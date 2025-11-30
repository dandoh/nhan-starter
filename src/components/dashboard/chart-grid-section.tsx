'use client'

import React, { useState } from 'react'
import { RangeSelector } from './range-selector'
import { type IndicatorSymbol } from '@/config/indicators'

interface ChartGridSectionProps {
  title: string
  symbols: IndicatorSymbol[]
  minTime: number
  maxTime: number
  defaultStart: number
  defaultEnd: number
  renderChart: (symbol: IndicatorSymbol, range: { start: number; end: number }) => React.ReactNode
}

export function ChartGridSection({
  title,
  symbols,
  minTime,
  maxTime,
  defaultStart,
  defaultEnd,
  renderChart,
}: ChartGridSectionProps) {
  const [range, setRange] = useState({ start: defaultStart, end: defaultEnd })

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      
      <RangeSelector
        minTime={minTime}
        maxTime={maxTime}
        startTime={range.start}
        endTime={range.end}
        onRangeChange={(start, end) => setRange({ start, end })}
        className="mb-4"
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {symbols.map((symbol) => renderChart(symbol, range))}
      </div>
    </section>
  )
}

