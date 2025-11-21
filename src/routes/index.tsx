import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Settings, Activity, Plus, Database, Trash2, Loader2 } from 'lucide-react'
import { InfrastructureStatusWidget } from '@/components/infrastructure-status-widget'
import { orpcQuery } from '@/orpc/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAppForm } from '@/hooks/use-app-form'
import { connectionSchema, type Connection } from '@/lib/schemas'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const queryClient = useQueryClient()

  // Fetch connectors
  const { data: connectors = [], isLoading } = useQuery(
    orpcQuery.listAllConnectors.queryOptions(),
  )

  // Delete mutation
  const deleteMutation = useMutation(
    orpcQuery.deleteConnectorById.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpcQuery.listAllConnectors.queryKey(),
        })
      },
    }),
  )

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this connector?')) {
      await deleteMutation.mutateAsync({ id })
    }
  }

  return (
    <div className="container mx-auto max-w-6xl p-6 space-y-6">
      <header className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Diff Streamer</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <InfrastructureStatusWidget />
          <Link to="/config">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <Settings className="h-4 w-4" />
              <span className="sr-only">Settings</span>
            </Button>
          </Link>
        </div>
      </header>

      <main className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Connectors</h2>
            <p className="text-sm text-muted-foreground">
              Manage your database connectors for CDC streaming
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Connector
          </Button>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : connectors.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Database className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No connectors yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first connector to start streaming database changes
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Connector
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {connectors.map((connector: Connection) => (
              <Card key={connector.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{connector.name}</CardTitle>
                      <CardDescription className="mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {connector.dbType}
                        </Badge>
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(connector.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Host:</span>{' '}
                    <span className="font-mono">{connector.host}:{connector.port}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Database:</span>{' '}
                    <span className="font-mono">{connector.database}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Topic Prefix:</span>{' '}
                    <span className="font-mono">{connector.topicPrefix}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <CreateConnectorDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  )
}

interface CreateConnectorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function CreateConnectorDialog({ open, onOpenChange }: CreateConnectorDialogProps) {
  const queryClient = useQueryClient()

  const saveMutation = useMutation(
    orpcQuery.saveConnectorData.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpcQuery.listAllConnectors.queryKey(),
        })
        onOpenChange(false)
      },
    }),
  )

  const form = useAppForm({
    defaultValues: {
      id: crypto.randomUUID(),
      name: '',
      dbType: 'mysql' as const,
      host: 'localhost',
      port: 5432,
      username: '',
      password: '',
      database: '',
      connectorName: '',
      topicPrefix: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Connection,
    validators: {
      onChange: connectionSchema,
    },
    onSubmit: async ({ value }) => {
      await saveMutation.mutateAsync(value)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Connector</DialogTitle>
          <DialogDescription>
            Configure a new database connector for CDC streaming
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="space-y-6"
        >
          {saveMutation.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{String(saveMutation.error)}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <form.AppField
              name="name"
              children={(field) => (
                <field.TextField
                  label="Connector Name"
                  placeholder="My Database Connector"
                  description="A friendly name for this connector"
                />
              )}
            />

            <form.AppField
              name="dbType"
              children={(field) => (
                <field.Select
                  label="Database Type"
                  values={[
                    { value: 'mysql', label: 'MySQL' },
                  ]}
                />
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <form.AppField
                name="host"
                children={(field) => (
                  <field.TextField
                    label="Host"
                    placeholder="localhost"
                  />
                )}
              />

              <form.AppField
                name="port"
                children={(field) => (
                  <field.NumberField
                    label="Port"
                    min={1}
                    max={65535}
                  />
                )}
              />
            </div>

            <form.AppField
              name="database"
              children={(field) => (
                <field.TextField
                  label="Database"
                  placeholder="mydb"
                />
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <form.AppField
                name="username"
                children={(field) => (
                  <field.TextField
                    label="Username"
                    placeholder="postgres"
                  />
                )}
              />

              <form.AppField
                name="password"
                children={(field) => (
                  <field.TextField
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                  />
                )}
              />
            </div>

            <form.AppField
              name="connectorName"
              children={(field) => (
                <field.TextField
                  label="Kafka Connector Name"
                  placeholder="my-db-connector"
                  description="Unique name for the Kafka Connect connector"
                />
              )}
            />

            <form.AppField
              name="topicPrefix"
              children={(field) => (
                <field.TextField
                  label="Topic Prefix"
                  placeholder="mydb"
                  description="Prefix for Kafka topics (e.g., mydb.public.users)"
                />
              )}
            />
          </div>

          <form.Subscribe
            selector={(state) => ({
              canSubmit: state.canSubmit,
            })}
          >
            {({ canSubmit }) => (
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!canSubmit || saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Connector
                    </>
                  )}
                </Button>
              </div>
            )}
          </form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  )
}
