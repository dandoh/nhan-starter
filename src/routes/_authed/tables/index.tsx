import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { like, useLiveQuery } from '@tanstack/react-db'
import { tablesCollection } from '@/lib/ai-table/collections'
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
import { AiTable } from '@/db/schema'
import { Search, Plus, Trash2 } from 'lucide-react'
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

export const Route = createFileRoute('/_authed/tables/')({
  component: TablesListPage,
})

function TablesListPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newTableName, setNewTableName] = useState('')
  const [filterQuery, setFilterQuery] = useState('')
  const [selectedTableIds, setSelectedTableIds] = useState<Set<string>>(
    new Set(),
  )
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const navigate = useNavigate()

  // Live query for all tables with filtering by name
  // Using TanStack DB's query within useLiveQuery, then filtering the results reactively
  const { data: allTables = [] } = useLiveQuery((q) =>
    q
      .from({ table: tablesCollection })
      .where(({ table }) => like(table.name, "%" + filterQuery + "%"))
      .orderBy(({ table }) => table.createdAt, 'desc'),
  )

  // Filter tables by name - reactive to both allTables (from liveQuery) and filterQuery
  const tables = useMemo(() => {
    if (!filterQuery.trim()) {
      return allTables
    }
    const queryLower = filterQuery.toLowerCase()
    return allTables.filter((table) =>
      table.name?.toLowerCase().includes(queryLower),
    )
  }, [allTables, filterQuery])

  const createTable = async (name: string) => {
    const newTable = {
      id: crypto.randomUUID(),
      name,
      columnSizing: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const tx = tablesCollection.insert(newTable as AiTable)
    await tx.isPersisted.promise

    return newTable.id
  }

  const handleCreateTable = async () => {
    if (newTableName.trim()) {
      const tableId = await createTable(newTableName.trim())
      setNewTableName('')
      setIsCreateDialogOpen(false)
      navigate({ to: '/tables/$tableId', params: { tableId } })
    }
  }

  const handleRowClick = (tableId: string) => {
    navigate({ to: '/tables/$tableId', params: { tableId } })
  }

  const toggleTableSelection = (tableId: string) => {
    setSelectedTableIds((prev) => {
      const next = new Set(prev)
      if (next.has(tableId)) {
        next.delete(tableId)
      } else {
        next.add(tableId)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedTableIds.size === tables.length) {
      setSelectedTableIds(new Set())
    } else {
      setSelectedTableIds(new Set(tables.map((table) => table.id)))
    }
  }

  const isAllSelected = tables.length > 0 && selectedTableIds.size === tables.length
  const isSomeSelected =
    selectedTableIds.size > 0 && selectedTableIds.size < tables.length

  const handleDeleteSelected = async () => {
    const deletePromises = Array.from(selectedTableIds).map((tableId) =>
      tablesCollection.delete(tableId),
    )
    await Promise.all(deletePromises)
    setSelectedTableIds(new Set())
    setIsDeleteDialogOpen(false)
  }

  const selectedCount = selectedTableIds.size

  return (
    <AppPageWrapper>
      <TopNav breadcrumbs={[{ label: 'Tables' }]} />
      <AppPageContentWrapper className="bg-background">
        <div className="mb-4 flex items-center justify-between space-x-2">
          <div className="relative w-full max-w-2xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter by table name or owner..."
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
                New table
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Table</DialogTitle>
                <DialogDescription>
                  Give your table a name. You can add columns and rows after
                  creation.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="table-name">Table Name</Label>
                  <Input
                    id="table-name"
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateTable()
                      }
                    }}
                    placeholder="e.g., Customer Research, Product Ideas..."
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
                <Button onClick={handleCreateTable}>Create Table</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {tables.length === 0 && filterQuery.trim() ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed border-border p-12 text-center">
            <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
              <svg
                className="mb-4 h-10 w-10 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                No tables found
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Try adjusting your search query to find tables.
              </p>
            </div>
          </div>
        ) : tables.length === 0 ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed border-border p-12 text-center">
            <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
              <svg
                className="mb-4 h-10 w-10 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                No tables yet
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Get started by creating your first table. Add columns, rows, and
                let AI help you populate data.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                Create Your First Table
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
                <TableHead>Table Name</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tables.map((table) => {
                const user = (table as any).user
                const ownerName = user?.name || user?.email || 'Unknown'
                const isSelected = selectedTableIds.has(table.id)
                return (
                  <TableRow
                    key={table.id}
                    onClick={() => handleRowClick(table.id)}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    data-state={isSelected ? 'selected' : undefined}
                  >
                    <TableCell
                      onClick={(e) => e.stopPropagation()}
                      className="!w-[48px] !px-4"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleTableSelection(table.id)}
                        aria-label={`Select ${table.name}`}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{table.name}</span>
                        {table.description && (
                          <span className="text-sm text-muted-foreground line-clamp-1">
                            {table.description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {ownerName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDistanceToNow(table.createdAt, {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDistanceToNow(table.updatedAt, {
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
                {selectedCount} table{selectedCount > 1 ? 's' : ''} selected
              </span>
              <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
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
                      This will permanently delete {selectedCount} table
                      {selectedCount > 1 ? 's' : ''}. This action cannot be undone.
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
