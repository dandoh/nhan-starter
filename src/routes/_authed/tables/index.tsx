import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useTablesList } from '@/hooks/use-tables-list'
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
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { formatDistanceToNow } from 'date-fns'
import {
  TopNav,
  AppPageWrapper,
  AppPageContentWrapper,
} from '@/components/AppPageWrapper'

export const Route = createFileRoute('/_authed/tables/')({
  component: TablesListPage,
})

function TablesListPage() {
  const { tables, createTable } = useTablesList()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newTableName, setNewTableName] = useState('')

  const handleCreateTable = () => {
    if (newTableName.trim()) {
      createTable(newTableName.trim())
      setNewTableName('')
      setIsCreateDialogOpen(false)
    }
  }

  return (
    <AppPageWrapper>
      <TopNav breadcrumbs={[{ label: 'AI Tables' }]} />
      <AppPageContentWrapper className="bg-background">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">
              Create and manage your dynamic tables with AI-powered columns
            </p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>Create New Table</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Table</DialogTitle>
                <DialogDescription>
                  Give your table a name. You can add columns and rows after creation.
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
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTable}>Create Table</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {tables.length === 0 ? (
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
              <h3 className="mb-2 text-lg font-semibold text-foreground">No tables yet</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Get started by creating your first table. Add columns, rows, and let AI help you
                populate data.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>Create Your First Table</Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tables.map((table) => (
              <Link
                key={table.id}
                to="/tables/$tableId"
                params={{ tableId: table.id }}
                className="transition-transform hover:scale-105"
              >
                <Card className="cursor-pointer hover:border-primary">
                  <CardHeader>
                    <CardTitle>{table.name}</CardTitle>
                    <CardDescription>
                      Created {formatDistanceToNow(new Date(table.createdAt), { addSuffix: true })}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
      </AppPageContentWrapper>
    </AppPageWrapper>
  )
}

