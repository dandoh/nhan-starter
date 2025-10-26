import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useWorkbooksList } from '@/hooks/use-workbooks-list'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Label } from '@/components/ui/label'
import { formatDistanceToNow } from 'date-fns'
import {
  TopNav,
  AppPageWrapper,
  AppPageContentWrapper,
} from '@/components/AppPageWrapper'
import { BookOpen, Plus, Trash2 } from 'lucide-react'
import type { Workbook } from '@/db/schema'

export const Route = createFileRoute('/_authed/workbooks/')({
  component: WorkbooksListPage,
})

function WorkbooksListPage() {
  const { workbooks, createWorkbook, deleteWorkbook, isCreating, isDeleting } =
    useWorkbooksList()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newWorkbookName, setNewWorkbookName] = useState('')
  const [newWorkbookDescription, setNewWorkbookDescription] = useState('')
  const [deleteConfirmWorkbook, setDeleteConfirmWorkbook] =
    useState<Workbook | null>(null)

  const handleCreateWorkbook = () => {
    if (newWorkbookName.trim()) {
      createWorkbook(
        newWorkbookName.trim(),
        newWorkbookDescription.trim() || undefined,
      )
      setNewWorkbookName('')
      setNewWorkbookDescription('')
      setIsCreateDialogOpen(false)
    }
  }

  const handleDeleteWorkbook = () => {
    if (deleteConfirmWorkbook) {
      deleteWorkbook(deleteConfirmWorkbook.id)
      setDeleteConfirmWorkbook(null)
    }
  }

  return (
    <AppPageWrapper>
      <TopNav breadcrumbs={[{ label: 'Workbooks' }]} />
      <AppPageContentWrapper className="bg-background">
        <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
                Workbooks
              </h1>
              <p className="text-muted-foreground">
                Create and manage your workbooks containing tables, text, and AI
                analysis
              </p>
            </div>

            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Workbook
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Workbook</DialogTitle>
                  <DialogDescription>
                    Create a new workbook to organize your data, analysis, and AI
                    interactions.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="workbook-name">Name</Label>
                    <Input
                      id="workbook-name"
                      value={newWorkbookName}
                      onChange={(e) => setNewWorkbookName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleCreateWorkbook()
                        }
                      }}
                      placeholder="e.g., Q4 Market Research, Product Analysis..."
                      autoFocus
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="workbook-description">
                      Description (optional)
                    </Label>
                    <Textarea
                      id="workbook-description"
                      value={newWorkbookDescription}
                      onChange={(e) => setNewWorkbookDescription(e.target.value)}
                      placeholder="What is this workbook for?"
                      rows={3}
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
                  <Button onClick={handleCreateWorkbook} disabled={isCreating}>
                    {isCreating ? 'Creating...' : 'Create Workbook'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {workbooks.length === 0 ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed border-border p-12 text-center">
              <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
                <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  No workbooks yet
                </h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Get started by creating your first workbook. Combine tables,
                  text, and AI analysis in one place.
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Workbook
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workbooks.map((workbook) => (
                    <TableRow key={workbook.id}>
                      <TableCell className="font-medium">
                        <Link
                          to="/workbooks/$workbookId"
                          params={{ workbookId: workbook.id }}
                          className="text-primary hover:underline"
                        >
                          {workbook.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {workbook.description || (
                          <span className="italic">No description</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(workbook.createdAt), {
                          addSuffix: true,
                        })}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(workbook.updatedAt), {
                          addSuffix: true,
                        })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault()
                            setDeleteConfirmWorkbook(workbook)
                          }}
                          disabled={isDeleting}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
      </AppPageContentWrapper>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteConfirmWorkbook}
        onOpenChange={(open) => !open && setDeleteConfirmWorkbook(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workbook</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "
              <span className="font-semibold">
                {deleteConfirmWorkbook?.name}
              </span>
              "? This action cannot be undone and will delete all blocks,
              tables, and data within this workbook.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWorkbook}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Workbook
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppPageWrapper>
  )
}

