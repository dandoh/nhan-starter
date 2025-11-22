import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Settings, Activity, Plus, Trash2, Loader2, Play, TestTube2, CheckCircle2 } from 'lucide-react'
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
import { MySQLValidationStatus } from '@/components/mysql-validation-status'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

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
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="h-5 w-5" />
          </div>
          <h1 className="text-md font-bold tracking-tight">Diff Streamer</h1>
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

      <main>
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : connectors.length === 0 ? (
          /* Empty State */
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-16 sm:py-20">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-6">
                <Activity className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No connectors yet</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
                Get started by creating your first database connector to stream events in real-time
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Connector
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {connectors.map((connector: Connection) => (
              <Card key={connector.id} className="relative group">
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
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(connector.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="space-y-2">
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
                  </div>
                  <Button
                    className="w-full"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate({ to: '/connector/$id', params: { id: connector.id } })}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    View Stream
                  </Button>
                </CardContent>
              </Card>
            ))}
            
            {/* Create New Connector Card */}
            <Card 
              className="relative group border-dashed border-2 hover:border-primary/50 hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <CardContent className="flex flex-col items-center justify-center py-16 h-full">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                  <Plus className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold mb-1">Create Connector</h3>
                <p className="text-xs text-muted-foreground text-center">
                  Add a new database connection
                </p>
              </CardContent>
            </Card>
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
  const [connectionTested, setConnectionTested] = useState(false)
  const [validationResults, setValidationResults] = useState<any>(null)

  const saveMutation = useMutation(
    orpcQuery.saveConnectorData.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpcQuery.listAllConnectors.queryKey(),
        })
        handleDialogOpenChange(false)
        // Reset form
        form.reset()
      },
    }),
  )

  const validateMutation = useMutation(
    orpcQuery.validateMySQLConfig.mutationOptions({
      onSuccess: (data) => {
        setValidationResults(data)
        setConnectionTested(true)
      },
      onError: (error) => {
        setValidationResults({
          isReady: false,
          results: [{
            step: 'Connection',
            status: 'error',
            message: String(error),
          }]
        })
        setConnectionTested(true)
      }
    }),
  )

  const fixMutation = useMutation(
    orpcQuery.validateAndFixMySQLConfig.mutationOptions({
      onSuccess: (data) => {
        setValidationResults(data)
      },
    }),
  )

  const form = useAppForm({
    defaultValues: {
      id: crypto.randomUUID(),
      name: 'testconnector',
      dbType: 'mysql' as const,
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'rootpassword',
      database: 'nhan_starter_dev',
      connectorName: 'testconnector',
      topicPrefix: 'testconnector',
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

  const handleTestConnection = () => {
    const values = form.state.values
    setConnectionTested(false)
    setValidationResults(null)
    
    if (values.dbType === 'mysql') {
      validateMutation.mutate({
        host: values.host,
        port: values.port,
        username: values.username,
        password: values.password,
        database: values.database,
      })
    }
  }

  const handleRunFixes = () => {
    const values = form.state.values
    
    if (values.dbType === 'mysql') {
      fixMutation.mutate({
        host: values.host,
        port: values.port,
        username: values.username,
        password: values.password,
        database: values.database,
      })
    }
  }

  const isConnectionReady = connectionTested && validationResults?.isReady

  // Reset validation state when dialog closes
  const handleDialogOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen)
    if (!isOpen) {
      setConnectionTested(false)
      setValidationResults(null)
      validateMutation.reset()
      fixMutation.reset()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Connector</DialogTitle>
          <DialogDescription>
            Configure a new database connector for streaming
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
              <AlertDescription className="whitespace-pre-wrap">
                {String(saveMutation.error)}
              </AlertDescription>
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

          {/* Validation Results */}
          {(validateMutation.isPending || validationResults) && (
            <div className="mt-4">
              <MySQLValidationStatus
                isValidating={validateMutation.isPending || fixMutation.isPending}
                validationResults={validationResults?.results || null}
                isReady={validationResults?.isReady || false}
                onRunFixes={handleRunFixes}
                canRunFixes={true}
              />
            </div>
          )}

          {/* Actions */}
          <form.Subscribe
            selector={(state) => ({
              canSubmit: state.canSubmit,
            })}
          >
            {({ canSubmit }) => (
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-border mt-6">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleDialogOpenChange(false)}
                >
                  Cancel
                </Button>

                {!isConnectionReady ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleTestConnection}
                    disabled={validateMutation.isPending || fixMutation.isPending}
                  >
                    {validateMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <TestTube2 className="h-4 w-4 mr-2" />
                        Test Connection
                      </>
                    )}
                  </Button>
                ) : (
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
                )}
              </div>
            )}
          </form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  )
}
