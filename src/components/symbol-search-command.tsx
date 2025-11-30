import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { TrendingUp } from 'lucide-react'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'

export function SymbolSearchCommand() {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState('')
  const navigate = useNavigate()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const handleSubmit = React.useCallback(() => {
    if (!value.trim()) return

    // Parse comma-separated symbols and clean them up
    const symbols = value
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0)

    if (symbols.length === 0) return

    // Navigate to compare page with symbols
    navigate({
      to: '/dashboard/compare',
      search: { symbols: symbols.join(',') },
    })

    // Reset and close
    setValue('')
    setOpen(false)
  }, [value, navigate])

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search Symbols"
      description="Enter stock symbols to compare"
    >
      <CommandInput
        placeholder="Enter symbols separated by commas (e.g., AAPL, MSFT, GOOGL)"
        value={value}
        onValueChange={setValue}
        onKeyDown={handleKeyDown}
      />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-4">
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Enter symbols and press Enter to compare charts
            </p>
          </div>
        </CommandEmpty>
        {value.trim() && (
          <CommandGroup heading="Actions">
            <CommandItem onSelect={handleSubmit}>
              <TrendingUp className="mr-2 h-4 w-4" />
              <span>
                Compare:{' '}
                {value
                  .split(',')
                  .map((s) => s.trim().toUpperCase())
                  .filter((s) => s.length > 0)
                  .join(', ')}
              </span>
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
