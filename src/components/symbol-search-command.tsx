import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { TrendingUp, Plus, Save, Loader2 } from 'lucide-react'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { orpcClient } from '@/orpc/client'

type Mode = 'search' | 'create-name' | 'save-name'

export function SymbolSearchCommand() {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState('')
  const [mode, setMode] = React.useState<Mode>('search')
  const [dashboardName, setDashboardName] = React.useState('')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const nameInputRef = React.useRef<HTMLInputElement>(null)

  // Focus name input when mode changes
  React.useEffect(() => {
    if ((mode === 'create-name' || mode === 'save-name') && nameInputRef.current) {
      nameInputRef.current.focus()
    }
  }, [mode])

  // Create dashboard mutation
  const createDashboard = useMutation({
    mutationFn: async (data: { name: string; symbols: string[] }) => {
      return orpcClient.dashboard.create(data)
    },
    onSuccess: (result) => {
      // Invalidate dashboard list query
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'list'] })
      // Navigate to the new dashboard
      navigate({ to: '/dashboard/d/$id', params: { id: result.id } })
      // Reset state
      resetAndClose()
    },
  })

  const resetAndClose = React.useCallback(() => {
    setValue('')
    setMode('search')
    setDashboardName('')
    setOpen(false)
  }, [])

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

  // Reset mode when dialog closes
  React.useEffect(() => {
    if (!open) {
      setMode('search')
      setDashboardName('')
    }
  }, [open])

  const parseSymbols = React.useCallback((input: string) => {
    return input
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0)
  }, [])

  const handleCompare = React.useCallback(() => {
    if (!value.trim()) return
    const symbols = parseSymbols(value)
    if (symbols.length === 0) return

    navigate({
      to: '/dashboard/compare',
      search: { symbols: symbols.join(',') },
    })
    resetAndClose()
  }, [value, navigate, parseSymbols, resetAndClose])

  const handleCreateDashboard = React.useCallback(() => {
    setMode('create-name')
    setDashboardName('')
  }, [])

  const handleSaveAsDashboard = React.useCallback(() => {
    setMode('save-name')
    setDashboardName('')
  }, [])

  const handleSubmitName = React.useCallback(() => {
    if (!dashboardName.trim()) return

    const symbols = mode === 'save-name' ? parseSymbols(value) : []
    createDashboard.mutate({ name: dashboardName.trim(), symbols })
  }, [dashboardName, mode, value, parseSymbols, createDashboard])

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && mode === 'search' && value.trim()) {
        e.preventDefault()
        handleCompare()
      }
      if (e.key === 'Escape' && mode !== 'search') {
        e.preventDefault()
        setMode('search')
      }
    },
    [mode, value, handleCompare],
  )

  const handleNameKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSubmitName()
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setMode('search')
      }
    },
    [handleSubmitName],
  )

  const symbols = parseSymbols(value)
  const hasSymbols = symbols.length > 0

  // Name input mode
  if (mode === 'create-name' || mode === 'save-name') {
    return (
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={mode === 'create-name' ? 'Create Dashboard' : 'Save as Dashboard'}
        description={
          mode === 'create-name'
            ? 'Enter a name for your new dashboard'
            : `Save ${symbols.join(', ')} as a dashboard`
        }
      >
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="dashboard-name" className="text-sm font-medium">
              Dashboard Name
            </label>
            <Input
              ref={nameInputRef}
              id="dashboard-name"
              placeholder="My Dashboard"
              value={dashboardName}
              onChange={(e) => setDashboardName(e.target.value)}
              onKeyDown={handleNameKeyDown}
              disabled={createDashboard.isPending}
            />
          </div>
          {mode === 'save-name' && symbols.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Symbols: {symbols.join(', ')}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setMode('search')}
              disabled={createDashboard.isPending}
            >
              Back
            </Button>
            <Button
              onClick={handleSubmitName}
              disabled={!dashboardName.trim() || createDashboard.isPending}
            >
              {createDashboard.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create'
              )}
            </Button>
          </div>
        </div>
      </CommandDialog>
    )
  }

  // Search mode
  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search Symbols"
      description="Enter stock symbols to compare or create a dashboard"
    >
      <CommandInput
        placeholder="Enter symbols separated by commas (e.g., AAPL, MSFT, GOOGL)"
        value={value}
        onValueChange={setValue}
        onKeyDown={handleKeyDown}
      />
      <CommandList>
        {!hasSymbols && (
          <>
            <CommandEmpty>
              <div className="flex flex-col items-center gap-2 py-4">
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Enter symbols to compare, or create a new dashboard
                </p>
              </div>
            </CommandEmpty>
            <CommandGroup heading="Actions">
              <CommandItem onSelect={handleCreateDashboard}>
                <Plus className="mr-2 h-4 w-4" />
                <span>Create New Dashboard</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}
        {hasSymbols && (
          <CommandGroup heading="Actions">
            <CommandItem onSelect={handleCompare}>
              <TrendingUp className="mr-2 h-4 w-4" />
              <span>Compare: {symbols.join(', ')}</span>
            </CommandItem>
            <CommandSeparator className="my-1" />
            <CommandItem onSelect={handleSaveAsDashboard}>
              <Save className="mr-2 h-4 w-4" />
              <span>Save as Dashboard: {symbols.join(', ')}</span>
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
