import { cn } from '@/lib/utils'

interface SectorData {
  symbol: string
  displayName: string
  value: number | null
  change1d: number | null
  change1w: number | null
  change1m: number | null
}

interface SectorGridProps {
  sectors: SectorData[]
  selectedSymbol: string | null
  onSelect: (symbol: string) => void
}

export function SectorGrid({ sectors, selectedSymbol, onSelect }: SectorGridProps) {
  // Sort sectors by 1-day change for visual hierarchy
  const sortedSectors = [...sectors].sort((a, b) => {
    const changeA = a.change1d ?? 0
    const changeB = b.change1d ?? 0
    return changeB - changeA
  })

  // Find min/max for color scaling
  const changes = sectors.map((s) => s.change1d ?? 0)
  const maxChange = Math.max(...changes, 1)
  const minChange = Math.min(...changes, -1)

  return (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
      {sortedSectors.map((sector) => {
        const isSelected = selectedSymbol === sector.symbol
        const change = sector.change1d ?? 0
        const intensity = getIntensity(change, minChange, maxChange)

        return (
          <button
            key={sector.symbol}
            onClick={() => onSelect(sector.symbol)}
            className={cn(
              'relative flex flex-col items-center justify-center p-3 rounded-lg border transition-all',
              'hover:scale-[1.02] hover:shadow-md',
              isSelected
                ? 'ring-2 ring-primary ring-offset-1'
                : 'border-transparent',
              getBackgroundColor(change, intensity)
            )}
          >
            <span className="text-xs font-medium opacity-80">{sector.symbol}</span>
            <span className="text-sm font-bold mt-0.5">{sector.displayName}</span>
            <span
              className={cn(
                'text-lg font-bold mt-1 tabular-nums',
                change >= 0 ? 'text-emerald-950' : 'text-red-950'
              )}
            >
              {formatChange(change)}
            </span>
            {sector.change1w !== null && (
              <span className="text-xs opacity-70 mt-0.5">
                1w: {formatChange(sector.change1w)}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function getIntensity(change: number, min: number, max: number): number {
  if (change >= 0) {
    return max > 0 ? change / max : 0
  } else {
    return min < 0 ? change / min : 0
  }
}

function getBackgroundColor(change: number, intensity: number): string {
  if (change >= 0) {
    // Green shades for positive
    if (intensity > 0.7) return 'bg-emerald-400'
    if (intensity > 0.4) return 'bg-emerald-300'
    if (intensity > 0.1) return 'bg-emerald-200'
    return 'bg-emerald-100'
  } else {
    // Red shades for negative
    if (intensity > 0.7) return 'bg-red-400'
    if (intensity > 0.4) return 'bg-red-300'
    if (intensity > 0.1) return 'bg-red-200'
    return 'bg-red-100'
  }
}

function formatChange(change: number | null): string {
  if (change === null) return '—'
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(2)}%`
}

