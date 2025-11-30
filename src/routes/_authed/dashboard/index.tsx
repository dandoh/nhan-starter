import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { Plus, Folder, MoreHorizontal, Trash2, Loader2 } from 'lucide-react'
import {
  TopNav,
  AppPageWrapper,
  AppPageContentWrapper,
} from '@/components/app-page-wrapper'
import { orpcClient, orpcQuery } from '@/orpc/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

dayjs.extend(relativeTime)

export const Route = createFileRoute('/_authed/dashboard/')({
  component: DashboardIndexPage,
})

function DashboardIndexPage() {
  const queryClient = useQueryClient()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newDashboardName, setNewDashboardName] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [dashboardToDelete, setDashboardToDelete] = useState<{
    id: string
    name: string
  } | null>(null)

  const { data, isLoading } = useQuery({
    ...orpcQuery.dashboard.list.queryOptions({ input: {} }),
    queryKey: ['dashboard', 'list'],
  })

  const createDashboard = useMutation({
    mutationFn: async (name: string) => {
      return orpcClient.dashboard.create({ name, symbols: [] })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'list'] })
      setCreateDialogOpen(false)
      setNewDashboardName('')
    },
  })

  const deleteDashboard = useMutation({
    mutationFn: async (id: string) => {
      return orpcClient.dashboard.remove({ id })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'list'] })
      setDeleteDialogOpen(false)
      setDashboardToDelete(null)
    },
  })

  const handleCreateDashboard = () => {
    if (newDashboardName.trim()) {
      createDashboard.mutate(newDashboardName.trim())
    }
  }

  const handleDeleteClick = (dashboard: { id: string; name: string }) => {
    setDashboardToDelete(dashboard)
    setDeleteDialogOpen(true)
  }

  const dashboards = data?.items || []

  return (
    <AppPageWrapper>
      <TopNav breadcrumbs={[{ label: 'Dashboard' }]}>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New Dashboard
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Dashboard</DialogTitle>
              <DialogDescription>
                Create a new dashboard to track your favorite symbols.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="Dashboard name"
                value={newDashboardName}
                onChange={(e) => setNewDashboardName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleCreateDashboard()
                  }
                }}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateDashboard}
                disabled={!newDashboardName.trim() || createDashboard.isPending}
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
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TopNav>

      <AppPageContentWrapper>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">My Dashboards</h1>
            <p className="text-sm text-muted-foreground">
              Create and manage your custom dashboards
            </p>
          </div>

          {isLoading ? (
            <DashboardListSkeleton />
          ) : dashboards.length === 0 ? (
            <EmptyState onCreateClick={() => setCreateDialogOpen(true)} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboards.map((dashboard) => (
                <DashboardCard
                  key={dashboard.id}
                  dashboard={dashboard}
                  onDeleteClick={() =>
                    handleDeleteClick({ id: dashboard.id, name: dashboard.name })
                  }
                />
              ))}
            </div>
          )}
        </div>
      </AppPageContentWrapper>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dashboard</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{dashboardToDelete?.name}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                dashboardToDelete && deleteDashboard.mutate(dashboardToDelete.id)
              }
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
    </AppPageWrapper>
  )
}

interface DashboardCardProps {
  dashboard: {
    id: string
    name: string
    description: string | null
    symbols: string[]
    createdAt: Date
    updatedAt: Date
  }
  onDeleteClick: () => void
}

function DashboardCard({ dashboard, onDeleteClick }: DashboardCardProps) {
  return (
    <div className="group relative rounded-lg border bg-card p-4 hover:border-primary/50 transition-colors">
      <Link
        to="/dashboard/d/$id"
        params={{ id: dashboard.id }}
        className="absolute inset-0 z-0"
      />
      <div className="relative z-10 pointer-events-none">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-primary" />
            <h3 className="font-semibold truncate">{dashboard.name}</h3>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={onDeleteClick}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {dashboard.description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {dashboard.description}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {dashboard.symbols.length}{' '}
            {dashboard.symbols.length === 1 ? 'symbol' : 'symbols'}
          </span>
          <span>Updated {dayjs(dashboard.updatedAt).fromNow()}</span>
        </div>

        {dashboard.symbols.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {dashboard.symbols.slice(0, 5).map((symbol) => (
              <span
                key={symbol}
                className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-xs"
              >
                {symbol}
              </span>
            ))}
            {dashboard.symbols.length > 5 && (
              <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                +{dashboard.symbols.length - 5} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
      <Folder className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <h3 className="text-lg font-medium mb-1">No dashboards yet</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Create your first dashboard to start tracking symbols
      </p>
      <Button onClick={onCreateClick}>
        <Plus className="h-4 w-4 mr-1" />
        Create Dashboard
      </Button>
    </div>
  )
}

function DashboardListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-[140px] rounded-lg" />
      ))}
    </div>
  )
}
