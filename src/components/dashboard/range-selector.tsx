'use client'

import React, { useEffect, useState, useRef } from 'react'
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
  const sliderContainerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef<{ x: number; start: number; end: number } | null>(null)

  // Sync local state with props when not dragging
  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalRange([startTime, endTime])
    }
  }, [startTime, endTime])

  const handleValueChange = (values: number[]) => {
    setLocalRange(values)
    onRangeChange(values[0], values[1])
  }

  const formatDate = (timestamp: number) => {
    return dayjs.unix(timestamp).format('MMM YYYY')
  }

  // Calculate percentages for positioning
  const duration = maxTime - minTime
  const startPct = ((localRange[0] - minTime) / duration) * 100
  const endPct = ((localRange[1] - minTime) / duration) * 100
  const widthPct = endPct - startPct

  const handleDragStart = (e: React.PointerEvent) => {
    e.preventDefault()
    isDraggingRef.current = true
    dragStartRef.current = {
      x: e.clientX,
      start: localRange[0],
      end: localRange[1],
    }
    
    // Capture pointer to handle drag outside container
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handleDragMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !dragStartRef.current || !sliderContainerRef.current) return

    const deltaX = e.clientX - dragStartRef.current.x
    const containerWidth = sliderContainerRef.current.clientWidth
    const deltaPct = deltaX / containerWidth
    const deltaTime = deltaPct * duration

    let newStart = dragStartRef.current.start + deltaTime
    let newEnd = dragStartRef.current.end + deltaTime

    // Clamp to bounds while maintaining duration
    const currentDuration = dragStartRef.current.end - dragStartRef.current.start
    
    if (newStart < minTime) {
      newStart = minTime
      newEnd = minTime + currentDuration
    }
    
    if (newEnd > maxTime) {
      newEnd = maxTime
      newStart = maxTime - currentDuration
    }

    setLocalRange([newStart, newEnd])
    onRangeChange(newStart, newEnd)
  }

  const handleDragEnd = (e: React.PointerEvent) => {
    isDraggingRef.current = false
    dragStartRef.current = null
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
  }

  // Determine if we should show combined label (handles are close)
  // const showCombinedLabel = widthPct < 20
  const centerPct = startPct + widthPct / 2

  return (
    <div className={cn('w-full px-2 py-8 bg-card border rounded-lg', className)}>
      <div className="relative w-full" ref={sliderContainerRef}>
        {/* Floating labels - always combined */}
        <div
          className="absolute -top-7 transform -translate-x-1/2 text-xs font-medium bg-primary/10 px-2 py-0.5 rounded text-foreground whitespace-nowrap z-30 pointer-events-none"
          style={{ left: `${centerPct}%` }}
        >
          {formatDate(localRange[0])} - {formatDate(localRange[1])}
        </div>

        <Slider
          min={minTime}
          max={maxTime}
          step={24 * 60 * 60} // 1 day step
          value={localRange}
          onValueChange={handleValueChange}
          className="w-full relative z-10"
        />

        {/* Draggable overlay for the range body */}
        {/* Positioned slightly inside the thumbs to avoid blocking them */}
        <div
          className="absolute top-0 h-full z-20 cursor-grab active:cursor-grabbing hover:bg-primary/10 transition-colors rounded-sm touch-none"
          style={{
            left: `calc(${startPct}% + 8px)`, 
            width: `calc(${widthPct}% - 16px)`,
            height: '20px', // Taller than slider track (usually ~6px) to be easily grabbable
            top: '-7px' // Center vertically over the slider track
          }}
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
        />
      </div>
      
      <div className="mt-2 flex justify-between text-xs text-muted-foreground/50 px-1">
        <span>{dayjs.unix(minTime).format('YYYY')}</span>
        <span>{dayjs.unix(maxTime).format('YYYY')}</span>
      </div>
    </div>
  )
}

