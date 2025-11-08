import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { like, useLiveQuery } from '@tanstack/react-db'
import { workbooksCollection } from '@/lib/workbooks/collections'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { formatDistanceToNow } from 'date-fns'
import {
  TopNav,
  AppPageWrapper,
  AppPageContentWrapper,
} from '@/components/AppPageWrapper'
import { Workbook } from '@/db/schema'
import { Search, Plus, Trash2, BookOpen } from 'lucide-react'
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

export const Route = createFileRoute('/_authed/workbooks/')({
  component: WorkbooksListPage,
})

function WorkbooksListPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newWorkbookName, setNewWorkbookName] = useState('')
  const [filterQuery, setFilterQuery] = useState('')
  const [selectedWorkbookIds, setSelectedWorkbookIds] = useState<Set<string>>(
    new Set(),
  )
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const navigate = useNavigate()

  // Live query for all workbooks with filtering by name
  const { data: workbooks = [] } = useLiveQuery((q) =>
    q
      .from({ workbook: workbooksCollection })
      .where(({ workbook }) => like(workbook.name, "%" + filterQuery + "%"))
      .orderBy(({ workbook }) => workbook.createdAt, 'desc'),
  )

  const createWorkbook = async (name: string) => {
    const newWorkbook = {
      id: crypto.randomUUID(),
      userId: '', // Placeholder - server will set the actual userId
      name,
      description: '',
      blockOrder: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const tx = workbooksCollection.insert(newWorkbook as Workbook)
    await tx.isPersisted.promise

    return newWorkbook.id
  }

  const handleCreateWorkbook = async () => {
    if (newWorkbookName.trim()) {
      const workbookId = await createWorkbook(newWorkbookName.trim())
      setNewWorkbookName('')
      setIsCreateDialogOpen(false)
      navigate({ to: '/workbooks/$workbookId', params: { workbookId } })
    }
  }

  const handleRowClick = (workbookId: string) => {
    navigate({ to: '/workbooks/$workbookId', params: { workbookId } })
  }

  const toggleWorkbookSelection = (workbookId: string) => {
    setSelectedWorkbookIds((prev) => {
      const next = new Set(prev)
      if (next.has(workbookId)) {
        next.delete(workbookId)
      } else {
        next.add(workbookId)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedWorkbookIds.size === workbooks.length) {
      setSelectedWorkbookIds(new Set())
    } else {
      setSelectedWorkbookIds(new Set(workbooks.map((workbook) => workbook.id)))
    }
  }

  const isAllSelected =
    workbooks.length > 0 && selectedWorkbookIds.size === workbooks.length
  const isSomeSelected =
    selectedWorkbookIds.size > 0 &&
    selectedWorkbookIds.size < workbooks.length

  const handleDeleteSelected = async () => {
    const deletePromises = Array.from(selectedWorkbookIds).map((workbookId) =>
      workbooksCollection.delete(workbookId),
    )
    await Promise.all(deletePromises)
    setSelectedWorkbookIds(new Set())
    setIsDeleteDialogOpen(false)
  }

  const selectedCount = selectedWorkbookIds.size

  return (
    <AppPageWrapper>
      <TopNav breadcrumbs={[{ label: 'Workbooks' }]} />
      <AppPageContentWrapper className="bg-background">
        <div className="mb-4 flex items-center justify-between space-x-2">
          <div className="relative w-full max-w-2xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter by workbook name..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="bg-card pl-9"
            />
          </div>

          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4" />
                New workbook
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Workbook</DialogTitle>
                <DialogDescription>
                  Give your workbook a name. You can add blocks after creation.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="workbook-name">Workbook Name</Label>
                  <Input
                    id="workbook-name"
                    value={newWorkbookName}
                    onChange={(e) => setNewWorkbookName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateWorkbook()
                      }
                    }}
                    placeholder="e.g., Project Analysis, Research Notes..."
                    autoFocus
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateWorkbook}>Create Workbook</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {workbooks.length === 0 && filterQuery.trim() ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed border-border p-12 text-center">
            <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
              <Search className="mb-4 h-10 w-10 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                No workbooks found
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Try adjusting your search query to find workbooks.
              </p>
            </div>
          </div>
        ) : workbooks.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed border-border p-12 text-center">
            <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
              <BookOpen className="mb-4 h-10 w-10 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                No workbooks yet
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Get started by creating your first workbook. Add blocks to
                organize your tables and data.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                Create Your First Workbook
              </Button>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="!w-[48px] !px-4">
                  <Checkbox
                    checked={
                      isAllSelected
                        ? true
                        : isSomeSelected
                          ? 'indeterminate'
                          : false
                    }
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Workbook Name</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workbooks.map((workbook) => {
                const isSelected = selectedWorkbookIds.has(workbook.id)
                return (
                  <TableRow
                    key={workbook.id}
                    onClick={() => handleRowClick(workbook.id)}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    data-state={isSelected ? 'selected' : undefined}
                  >
                    <TableCell
                      onClick={(e) => e.stopPropagation()}
                      className="!w-[48px] !px-4"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() =>
                          toggleWorkbookSelection(workbook.id)
                        }
                        aria-label={`Select ${workbook.name}`}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{workbook.name}</span>
                        {workbook.description && (
                          <span className="text-sm text-muted-foreground line-clamp-1">
                            {workbook.description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDistanceToNow(workbook.createdAt, {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDistanceToNow(workbook.updatedAt, {
                        addSuffix: true,
                      })}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}

        {selectedCount > 0 && (
          <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2">
            <div className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 shadow-lg">
              <span className="text-sm text-muted-foreground">
                {selectedCount} workbook{selectedCount > 1 ? 's' : ''} selected
              </span>
              <AlertDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
              >
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete {selectedCount} workbook
                      {selectedCount > 1 ? 's' : ''}. This action cannot be
                      undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteSelected}
                      className="bg-destructive !text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
      </AppPageContentWrapper>
    </AppPageWrapper>
  )
}

