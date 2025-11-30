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
    <div className={cn('w-full px-2 py-4 bg-card border rounded-lg select-none', className)}>
      <div className="relative w-full h-12" ref={sliderContainerRef}>
        {/* Floating labels - always combined */}
        <div
          className="absolute -top-7 transform -translate-x-1/2 text-xs font-medium bg-primary/10 px-2 py-0.5 rounded text-foreground whitespace-nowrap z-30 pointer-events-none transition-all"
          style={{ left: `${centerPct}%` }}
        >
          {formatDate(localRange[0])} - {formatDate(localRange[1])}
        </div>

        {/* Background Track (Minimap placeholder) */}
        <div className="absolute inset-0 top-1/2 -translate-y-1/2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
          {/* Optional: Add ticks here */}
        </div>

        {/* Visual Selection Window (Curtains) */}
        <div className="absolute inset-0 h-full pointer-events-none">
          {/* Left Curtain (Unselected) */}
          <div 
            className="absolute top-0 bottom-0 left-0 bg-background/80 z-10" 
            style={{ width: `${startPct}%` }}
          />
          
          {/* Right Curtain (Unselected) */}
          <div 
            className="absolute top-0 bottom-0 right-0 bg-background/80 z-10" 
            style={{ width: `${100 - endPct}%` }}
          />

          {/* Selected Window */}
          <div
            className="absolute top-0 bottom-0 z-20 bg-primary/5"
            style={{ 
              left: `${startPct}%`, 
              width: `${widthPct}%` 
            }}
          >
            {/* Left Line */}
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary cursor-ew-resize" />

            {/* Right Line */}
            <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-primary cursor-ew-resize" />
          </div>
        </div>

        {/* Invisible Interactive Slider */}
        <Slider
          min={minTime}
          max={maxTime}
          step={24 * 60 * 60}
          value={localRange}
          onValueChange={handleValueChange}
          className="absolute inset-0 z-30 opacity-0 [&_[role=slider]]:h-full [&_[role=slider]]:w-8 [&_[role=slider]]:cursor-ew-resize"
        />

        {/* Draggable overlay for the range body (middle part) */}
        <div
          className="absolute top-0 bottom-0 z-40 cursor-grab active:cursor-grabbing touch-none"
          style={{
            left: `calc(${startPct}% + 10px)`, // Offset to avoid blocking slider thumbs
            width: `calc(${widthPct}% - 20px)`,
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

