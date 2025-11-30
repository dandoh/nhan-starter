import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { IndicatorCategory } from '@/config/indicators'

interface IndicatorCardProps {
  symbol: string
  displayName: string
  value: number | null
  change1d: number | null
  change1w?: number | null
  category: IndicatorCategory
  isSelected?: boolean
  onClick?: () => void
}

export function IndicatorCard({
  symbol,
  displayName,
  value,
  change1d,
  change1w,
  category,
  isSelected,
  onClick,
}: IndicatorCardProps) {
  const trend = getTrend(change1d)
  const isPositive = change1d !== null && change1d > 0
  const isNegative = change1d !== null && change1d < 0

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-start p-3 rounded-lg border transition-all text-left',
        'hover:border-primary/50 hover:shadow-sm',
        isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
          : 'border-border bg-card'
      )}
    >
      {/* Category indicator */}
      <div
        className={cn(
          'absolute top-2 right-2 w-2 h-2 rounded-full',
          getCategoryColor(category)
        )}
      />

      {/* Symbol/Name */}
      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
        {symbol}
      </span>
      <span className="text-sm font-semibold mt-0.5 line-clamp-1">
        {displayName}
      </span>

      {/* Value */}
      <span className="text-lg font-bold mt-2 tabular-nums">
        {formatValue(value, category)}
      </span>

      {/* Change */}
      <div className="flex items-center gap-1 mt-1">
        {trend === 'up' && <TrendingUp className="w-3 h-3 text-chart-2" />}
        {trend === 'down' && <TrendingDown className="w-3 h-3 text-destructive" />}
        {trend === 'neutral' && <Minus className="w-3 h-3 text-muted-foreground" />}
        <span
          className={cn(
            'text-xs font-medium tabular-nums',
            isPositive && 'text-chart-2',
            isNegative && 'text-destructive',
            !isPositive && !isNegative && 'text-muted-foreground'
          )}
        >
          {formatChange(change1d)}
        </span>
        {change1w !== null && change1w !== undefined && (
          <span className="text-xs text-muted-foreground ml-1">
            ({formatChange(change1w)} 1w)
          </span>
        )}
      </div>
    </button>
  )
}

function getTrend(change: number | null): 'up' | 'down' | 'neutral' {
  if (change === null) return 'neutral'
  if (change > 0.01) return 'up'
  if (change < -0.01) return 'down'
  return 'neutral'
}

function formatValue(value: number | null, category: IndicatorCategory): string {
  if (value === null) return '—'

  // Rates are in percentages
  if (category === 'rates') {
    return `${value.toFixed(2)}%`
  }

  // Most ETFs are dollar prices
  if (value >= 100) {
    return `$${value.toFixed(2)}`
  }

  // Smaller values
  return value.toFixed(2)
}

function formatChange(change: number | null): string {
  if (change === null) return '—'
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(2)}%`
}

function getCategoryColor(category: IndicatorCategory): string {
  const colors: Record<IndicatorCategory, string> = {
    volatility: 'bg-chart-1',
    currency: 'bg-chart-2',
    rates: 'bg-chart-3',
    credit: 'bg-chart-4',
    commodities: 'bg-chart-5',
    sector: 'bg-primary',
  }
  return colors[category]
}

