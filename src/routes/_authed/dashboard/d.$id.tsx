import { useState, useCallback } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { X, Plus, Pencil, Check, Trash2, Loader2 } from 'lucide-react'
import {
  TopNav,
  AppPageWrapper,
  AppPageContentWrapper,
} from '@/components/app-page-wrapper'
import { orpcClient, orpcQuery } from '@/orpc/client'
import { ChartGridSection } from '@/components/dashboard/chart-grid-section'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export const Route = createFileRoute('/_authed/dashboard/d/$id')({
  component: DashboardPage,
})

function DashboardPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Fetch dashboard data
  const {
    data: dashboardData,
    isLoading,
    error,
  } = useQuery({
    ...orpcQuery.dashboard.get.queryOptions({ input: { id } }),
    queryKey: ['dashboard', 'get', id],
  })

  const { data: latestData } = useQuery(
    orpcQuery.market.getLatestDate.queryOptions({ input: {} })
  )

  // Update mutation
  const updateDashboard = useMutation({
    mutationFn: async (data: {
      name?: string
      description?: string | null
      symbols?: string[]
    }) => {
      return orpcClient.dashboard.update({ id, ...data })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'get', id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'list'] })
    },
  })

  // Delete mutation
  const deleteDashboard = useMutation({
    mutationFn: async () => {
      return orpcClient.dashboard.remove({ id })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'list'] })
      navigate({ to: '/dashboard/macros' })
    },
  })

  // Local state for editing
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editDescription, setEditDescription] = useState('')
  const [newSymbolInput, setNewSymbolInput] = useState('')

  const dashboard = dashboardData?.dashboard

  const handleStartEditName = useCallback(() => {
    if (dashboard) {
      setEditName(dashboard.name)
      setIsEditingName(true)
    }
  }, [dashboard])

  const handleSaveName = useCallback(() => {
    if (editName.trim()) {
      updateDashboard.mutate({ name: editName.trim() })
    }
    setIsEditingName(false)
  }, [editName, updateDashboard])

  const handleStartEditDescription = useCallback(() => {
    if (dashboard) {
      setEditDescription(dashboard.description || '')
      setIsEditingDescription(true)
    }
  }, [dashboard])

  const handleSaveDescription = useCallback(() => {
    updateDashboard.mutate({ description: editDescription.trim() || null })
    setIsEditingDescription(false)
  }, [editDescription, updateDashboard])

  const handleAddSymbols = useCallback(() => {
    if (!newSymbolInput.trim() || !dashboard) return

    const newSymbols = newSymbolInput
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0 && !dashboard.symbols.includes(s))

    if (newSymbols.length > 0) {
      updateDashboard.mutate({ symbols: [...dashboard.symbols, ...newSymbols] })
    }
    setNewSymbolInput('')
  }, [newSymbolInput, dashboard, updateDashboard])

  const handleRemoveSymbol = useCallback(
    (symbolToRemove: string) => {
      if (!dashboard) return
      const newSymbols = dashboard.symbols.filter((s) => s !== symbolToRemove)
      updateDashboard.mutate({ symbols: newSymbols })
    },
    [dashboard, updateDashboard]
  )

  if (isLoading) {
    return (
      <AppPageWrapper>
        <TopNav
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Loading...' },
          ]}
        />
        <AppPageContentWrapper fullWidth>
          <DashboardSkeleton />
        </AppPageContentWrapper>
      </AppPageWrapper>
    )
  }

  if (error || !dashboard) {
    return (
      <AppPageWrapper>
        <TopNav
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Not Found' },
          ]}
        />
        <AppPageContentWrapper fullWidth>
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-lg text-muted-foreground">
              Dashboard not found or you don't have access to it.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate({ to: '/dashboard/macros' })}
            >
              Go to Macros
            </Button>
          </div>
        </AppPageContentWrapper>
      </AppPageWrapper>
    )
  }

  return (
    <AppPageWrapper>
      <TopNav
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: dashboard.name },
        ]}
      >
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-destructive">
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Dashboard</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{dashboard.name}"? This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteDashboard.mutate()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteDashboard.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TopNav>
      <AppPageContentWrapper fullWidth>
        <div className="space-y-6">
          {/* Header Section */}
          <div className="space-y-2">
            {/* Editable Name */}
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName()
                    if (e.key === 'Escape') setIsEditingName(false)
                  }}
                  className="text-2xl font-bold h-auto py-1 px-2 max-w-md"
                  autoFocus
                />
                <Button size="sm" variant="ghost" onClick={handleSaveName}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditingName(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="text-2xl font-bold">{dashboard.name}</h1>
                <Button
                  size="sm"
                  variant="ghost"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={handleStartEditName}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Editable Description */}
            {isEditingDescription ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveDescription()
                    if (e.key === 'Escape') setIsEditingDescription(false)
                  }}
                  placeholder="Add a description..."
                  className="text-sm h-auto py-1 px-2 max-w-lg"
                  autoFocus
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSaveDescription}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditingDescription(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <p
                  className={`text-sm ${dashboard.description ? 'text-muted-foreground' : 'text-muted-foreground/50 italic'}`}
                >
                  {dashboard.description || 'No description'}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={handleStartEditDescription}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            )}

            {latestData?.date && (
              <p className="text-xs text-muted-foreground">
                Last updated: {dayjs(latestData.date).format('dddd, MMMM D, YYYY')}
              </p>
            )}
          </div>

          {/* Symbols Management */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                value={newSymbolInput}
                onChange={(e) => setNewSymbolInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddSymbols()
                  }
                }}
                placeholder="Add symbols (e.g., AAPL, MSFT)"
                className="max-w-xs"
              />
              <Button
                size="sm"
                onClick={handleAddSymbols}
                disabled={!newSymbolInput.trim() || updateDashboard.isPending}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {/* Current Symbols as badges */}
            {dashboard.symbols.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {dashboard.symbols.map((symbol) => (
                  <Badge
                    key={symbol}
                    variant="secondary"
                    className="pl-2 pr-1 py-1 gap-1"
                  >
                    {symbol}
                    <button
                      onClick={() => handleRemoveSymbol(symbol)}
                      className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Charts */}
          {dashboard.symbols.length > 0 ? (
            <ChartGridSection title="" symbols={dashboard.symbols} />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 border border-dashed rounded-lg">
              <p className="text-muted-foreground mb-2">
                No symbols in this dashboard yet
              </p>
              <p className="text-sm text-muted-foreground">
                Add symbols above to see their charts
              </p>
            </div>
          )}
        </div>
      </AppPageContentWrapper>
    </AppPageWrapper>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[280px]" />
        ))}
      </div>
    </div>
  )
}

