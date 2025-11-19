import { createFileRoute } from '@tanstack/react-router'
import {
  TopNav,
  AppPageWrapper,
  AppPageContentWrapper,
} from '@/components/app-page-wrapper'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orpcQuery } from '@/orpc/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'
import { PlusIcon, Trash2Icon, PencilIcon } from 'lucide-react'
import type { Expense } from '@/db/schema'

export const Route = createFileRoute('/_authed/expenses')({
  component: ExpensesPage,
})

function ExpensesPage() {
  const queryClient = useQueryClient()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  // Fetch expenses
  const { data: expenses = [], isLoading } = useQuery(
    orpcQuery.getExpenses.queryOptions()
  )

  // Create expense mutation
  const createExpenseMutation = useMutation({
    ...orpcQuery.createExpense.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries(orpcQuery.getExpenses.queryOptions())
      setIsCreateDialogOpen(false)
    },
  })

  // Update expense mutation
  const updateExpenseMutation = useMutation({
    ...orpcQuery.updateExpense.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries(orpcQuery.getExpenses.queryOptions())
      setEditingExpense(null)
    },
  })

  // Delete expense mutation
  const deleteExpenseMutation = useMutation({
    ...orpcQuery.deleteExpense.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries(orpcQuery.getExpenses.queryOptions())
    },
  })

  // Calculate total
  const total = expenses.reduce(
    (sum, expense) => sum + parseFloat(expense.amount),
    0
  )

  return (
    <AppPageWrapper>
      <TopNav breadcrumbs={[{ label: 'Expenses' }]} />
      <AppPageContentWrapper>
        <div className="mx-auto w-full max-w-4xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">My Expenses</h1>
              <p className="text-muted-foreground">
                Track and manage your expenses
              </p>
            </div>
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent>
                <CreateExpenseForm
                  onSubmit={createExpenseMutation.mutate}
                  isLoading={createExpenseMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>

          {/* Total Summary */}
          {expenses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Total Expenses</CardTitle>
                <CardDescription>
                  {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  ${total.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Expense List */}
          {isLoading ? (
            <div className="text-center text-muted-foreground">
              Loading expenses...
            </div>
          ) : expenses.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <p className="text-muted-foreground">
                  No expenses yet. Add your first expense to get started!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {expenses.map((expense) => (
                <Card key={expense.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-2xl">
                            ${parseFloat(expense.amount).toFixed(2)}
                          </CardTitle>
                          {expense.category && (
                            <Badge variant="secondary">
                              {expense.category}
                            </Badge>
                          )}
                        </div>
                        <CardTitle>{expense.description}</CardTitle>
                        {expense.notes && (
                          <CardDescription>{expense.notes}</CardDescription>
                        )}
                        <CardDescription>
                          {new Date(expense.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Dialog
                          open={editingExpense?.id === expense.id}
                          onOpenChange={(open) => {
                            if (!open) setEditingExpense(null)
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingExpense(expense)}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <EditExpenseForm
                              expense={expense}
                              onSubmit={updateExpenseMutation.mutate}
                              isLoading={updateExpenseMutation.isPending}
                            />
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (
                              confirm(
                                'Are you sure you want to delete this expense?'
                              )
                            ) {
                              deleteExpenseMutation.mutate({ id: expense.id })
                            }
                          }}
                        >
                          <Trash2Icon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      </AppPageContentWrapper>
    </AppPageWrapper>
  )
}

function CreateExpenseForm({
  onSubmit,
  isLoading,
}: {
  onSubmit: (data: {
    amount: number
    description: string
    category?: string
    date: string
    notes?: string
  }) => void
  isLoading: boolean
}) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [date, setDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [notes, setNotes] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      amount: parseFloat(amount),
      description,
      category: category || undefined,
      date: new Date(date).toISOString(),
      notes: notes || undefined,
    })
    setAmount('')
    setDescription('')
    setCategory('')
    setDate(new Date().toISOString().split('T')[0])
    setNotes('')
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Add New Expense</DialogTitle>
        <DialogDescription>
          Record a new expense to track your spending.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description *</Label>
          <Input
            id="description"
            placeholder="Enter expense description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            placeholder="e.g., Food, Transport, Entertainment..."
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">Date *</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Additional notes about this expense..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isLoading || !amount || !description}>
          {isLoading ? 'Adding...' : 'Add Expense'}
        </Button>
      </DialogFooter>
    </form>
  )
}

function EditExpenseForm({
  expense,
  onSubmit,
  isLoading,
}: {
  expense: Expense
  onSubmit: (data: {
    id: string
    amount?: number
    description?: string
    category?: string
    date?: string
    notes?: string
  }) => void
  isLoading: boolean
}) {
  const [amount, setAmount] = useState(expense.amount)
  const [description, setDescription] = useState(expense.description)
  const [category, setCategory] = useState(expense.category || '')
  const [date, setDate] = useState(
    new Date(expense.date).toISOString().split('T')[0]
  )
  const [notes, setNotes] = useState(expense.notes || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      id: expense.id,
      amount: parseFloat(amount),
      description,
      category: category || undefined,
      date: new Date(date).toISOString(),
      notes: notes || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Edit Expense</DialogTitle>
        <DialogDescription>
          Update your expense details.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="edit-amount">Amount *</Label>
          <Input
            id="edit-amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-description">Description *</Label>
          <Input
            id="edit-description"
            placeholder="Enter expense description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-category">Category</Label>
          <Input
            id="edit-category"
            placeholder="e.g., Food, Transport, Entertainment..."
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-date">Date *</Label>
          <Input
            id="edit-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-notes">Notes</Label>
          <Textarea
            id="edit-notes"
            placeholder="Additional notes about this expense..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isLoading || !amount || !description}>
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogFooter>
    </form>
  )
}

