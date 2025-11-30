'use client'

import React, { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'

interface RangeSelectorProps {
  minTime: number
  maxTime: number
  startTime: number
  endTime: number
  onRangeChange: (start: number, end: number) => void
  className?: string
}

export function RangeSelector({
  minTime,
  maxTime,
  startTime,
  endTime,
  onRangeChange,
  className,
}: RangeSelectorProps) {
  // Local state for smooth sliding
  const [localRange, setLocalRange] = useState([startTime, endTime])

  // Sync local state with props when not dragging
  useEffect(() => {
    setLocalRange([startTime, endTime])
  }, [startTime, endTime])

  const handleValueChange = (values: number[]) => {
    setLocalRange(values)
    onRangeChange(values[0], values[1])
  }

  const formatDate = (timestamp: number) => {
    return dayjs.unix(timestamp).format('MMM YYYY')
  }

  return (
    <div className={cn('w-full px-2 py-4 bg-card border rounded-lg', className)}>
      <div className="mb-4 flex items-center justify-between text-sm font-medium text-muted-foreground">
        <span>{formatDate(localRange[0])}</span>
        <span>{formatDate(localRange[1])}</span>
      </div>
      
      <Slider
        min={minTime}
        max={maxTime}
        step={24 * 60 * 60} // 1 day step
        value={localRange}
        onValueChange={handleValueChange}
        className="w-full"
      />
      
      <div className="mt-2 flex justify-between text-xs text-muted-foreground/50 px-1">
        <span>{dayjs.unix(minTime).format('YYYY')}</span>
        <span>{dayjs.unix(maxTime).format('YYYY')}</span>
      </div>
    </div>
  )
}

