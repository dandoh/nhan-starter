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
import { Checkbox } from '@/components/ui/checkbox'
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
import { useState } from 'react'
import { PlusIcon, Trash2Icon, PencilIcon } from 'lucide-react'
import type { Todo } from '@/db/schema'

export const Route = createFileRoute('/_authed/todos')({
  component: TodosPage,
})

function TodosPage() {
  const queryClient = useQueryClient()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)

  // Fetch todos
  const { data: todos = [], isLoading } = useQuery(orpcQuery.getTodos.queryOptions())

  // Create todo mutation
  const createTodoMutation = useMutation({
    ...orpcQuery.createTodo.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries(orpcQuery.getTodos.queryOptions())
      setIsCreateDialogOpen(false)
    },
  })

  // Update todo mutation
  const updateTodoMutation = useMutation({
    ...orpcQuery.updateTodo.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries(orpcQuery.getTodos.queryOptions())
      setEditingTodo(null)
    },
  })

  // Delete todo mutation
  const deleteTodoMutation = useMutation({
    ...orpcQuery.deleteTodo.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries(orpcQuery.getTodos.queryOptions())
    },
  })

  return (
    <AppPageWrapper>
      <TopNav breadcrumbs={[{ label: 'Todos' }]} />
      <AppPageContentWrapper>
        <div className="mx-auto w-full max-w-4xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">My Todos</h1>
              <p className="text-muted-foreground">
                Manage your tasks and stay organized
              </p>
            </div>
            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={setIsCreateDialogOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add Todo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <CreateTodoForm
                  onSubmit={createTodoMutation.mutate}
                  isLoading={createTodoMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>

          {/* Todo List */}
          {isLoading ? (
            <div className="text-center text-muted-foreground">
              Loading todos...
            </div>
          ) : todos.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <p className="text-muted-foreground">
                  No todos yet. Create your first todo to get started!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {todos.map((todo) => (
                <Card key={todo.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <Checkbox
                          checked={todo.completed}
                          onCheckedChange={(checked) => {
                            updateTodoMutation.mutate({
                              id: todo.id,
                              completed: checked as boolean,
                            })
                          }}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <CardTitle
                            className={
                              todo.completed ? 'line-through text-muted-foreground' : ''
                            }
                          >
                            {todo.title}
                          </CardTitle>
                          {todo.description && (
                            <CardDescription className="mt-1">
                              {todo.description}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Dialog
                          open={editingTodo?.id === todo.id}
                          onOpenChange={(open) => {
                            if (!open) setEditingTodo(null)
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingTodo(todo)}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <EditTodoForm
                              todo={todo}
                              onSubmit={updateTodoMutation.mutate}
                              isLoading={updateTodoMutation.isPending}
                            />
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (
                              confirm(
                                'Are you sure you want to delete this todo?'
                              )
                            ) {
                              deleteTodoMutation.mutate({ id: todo.id })
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

function CreateTodoForm({
  onSubmit,
  isLoading,
}: {
  onSubmit: (data: { title: string; description?: string }) => void
  isLoading: boolean
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ title, description: description || undefined })
    setTitle('')
    setDescription('')
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Create New Todo</DialogTitle>
        <DialogDescription>
          Add a new task to your todo list.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="Enter todo title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            placeholder="Enter todo description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isLoading || !title.trim()}>
          {isLoading ? 'Creating...' : 'Create Todo'}
        </Button>
      </DialogFooter>
    </form>
  )
}

function EditTodoForm({
  todo,
  onSubmit,
  isLoading,
}: {
  todo: Todo
  onSubmit: (data: { id: string; title: string; description?: string }) => void
  isLoading: boolean
}) {
  const [title, setTitle] = useState(todo.title)
  const [description, setDescription] = useState(todo.description || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ id: todo.id, title, description: description || undefined })
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Edit Todo</DialogTitle>
        <DialogDescription>
          Update your task details.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="edit-title">Title</Label>
          <Input
            id="edit-title"
            placeholder="Enter todo title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-description">Description (Optional)</Label>
          <Textarea
            id="edit-description"
            placeholder="Enter todo description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isLoading || !title.trim()}>
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogFooter>
    </form>
  )
}

