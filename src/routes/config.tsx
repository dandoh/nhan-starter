import { createFileRoute } from '@tanstack/react-router'
import { orpcQuery } from '@/orpc/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppForm } from '@/hooks/use-app-form'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Save, AlertCircle, Monitor, Server, ChevronLeft } from 'lucide-react'
import { cdcConfigSchema, type CDCConfig } from '@/lib/schemas'
import { ThemeToggle } from '@/components/theme-toggle'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/config')({
  component: ConfigPage,
})

function ConfigPage() {
  const queryClient = useQueryClient()

  // Load current config
  const { data: config, isLoading } = useQuery(
    orpcQuery.getConfig.queryOptions(),
  )

  // Save config and restart infrastructure (combined)
  const saveAndRestartMutation = useMutation(
    orpcQuery.saveConfigAndRestartInfra.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpcQuery.getConfig.queryKey(),
        })
        queryClient.invalidateQueries({
          queryKey: orpcQuery.infrastructureStatus.queryKey(),
        })
      },
    }),
  )

  // Initialize form with useAppForm
  const form = useAppForm({
    defaultValues:
      config ||
      ({
        projectName: '',
        kafka: {
          version: '',
          containerName: '',
          port: 9092,
          clusterId: '',
          dataDir: '',
        },
        kafkaConnect: {
          version: '',
          containerName: '',
          port: 8083,
          groupId: '',
          topics: {
            config: '',
            offset: '',
            status: '',
          },
          dataDir: '',
        },
      } as CDCConfig),
    validators: {
      onChange: cdcConfigSchema,
    },
    onSubmit: async ({ value }) => {
      // Save configuration and restart infrastructure atomically
      await saveAndRestartMutation.mutateAsync(value)
    },
  })

  if (isLoading || !config) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <Tabs defaultValue="infrastructure" className="container mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
          </Link>
          <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
        </div>
        <TabsList className="grid w-[300px] grid-cols-2">
          <TabsTrigger value="infrastructure" className="gap-2">
            <Server className="h-4 w-4" />
            Infrastructure
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Monitor className="h-4 w-4" />
            Appearance
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="infrastructure" className="mt-0">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              form.handleSubmit()
            }}
            className="space-y-6"
          >
            {saveAndRestartMutation.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{String(saveAndRestartMutation.error)}</AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Infrastructure Settings</CardTitle>
                <CardDescription>Configure core infrastructure components</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Project Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Project</h3>
                  <form.AppField
                    name="projectName"
                    children={(field) => (
                      <field.TextField
                        label="Project Name"
                        placeholder="cdc-streamer"
                        description="Lowercase alphanumeric with hyphens only"
                      />
                    )}
                  />
                </div>
                
                <div className="h-px bg-border" />

                {/* Kafka Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Kafka Broker</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <form.AppField
                      name="kafka.version"
                      children={(field) => <field.TextField label="Version" />}
                    />

                    <form.AppField
                      name="kafka.port"
                      children={(field) => <field.NumberField label="Port" min={1024} max={65535} />}
                    />
                  </div>

                  <form.AppField
                    name="kafka.containerName"
                    children={(field) => <field.TextField label="Container Name" />}
                  />

                  <form.AppField
                    name="kafka.dataDir"
                    children={(field) => <field.TextField label="Data Directory" />}
                  />

                  <form.AppField
                    name="kafka.clusterId"
                    children={(field) => (
                      <field.TextField
                        label="Cluster ID"
                        readOnly
                        description="Should not be changed once set"
                      />
                    )}
                  />
                </div>

                <div className="h-px bg-border" />

                {/* Kafka Connect Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Kafka Connect</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <form.AppField
                      name="kafkaConnect.version"
                      children={(field) => <field.TextField label="Version" />}
                    />

                    <form.AppField
                      name="kafkaConnect.port"
                      children={(field) => <field.NumberField label="Port" min={1024} max={65535} />}
                    />
                  </div>

                  <form.AppField
                    name="kafkaConnect.containerName"
                    children={(field) => <field.TextField label="Container Name" />}
                  />

                  <form.AppField
                    name="kafkaConnect.dataDir"
                    children={(field) => <field.TextField label="Data Directory" />}
                  />

                  <form.AppField
                    name="kafkaConnect.groupId"
                    children={(field) => <field.TextField label="Group ID" />}
                  />

                  <div className="space-y-2">
                    <Label>Internal Topics</Label>
                    <div className="grid grid-cols-1 gap-2">
                      <form.AppField
                        name="kafkaConnect.topics.config"
                        children={(field) => <field.TextField label="" placeholder="Config topic" />}
                      />
                      <form.AppField
                        name="kafkaConnect.topics.offset"
                        children={(field) => <field.TextField label="" placeholder="Offset topic" />}
                      />
                      <form.AppField
                        name="kafkaConnect.topics.status"
                        children={(field) => <field.TextField label="" placeholder="Status topic" />}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <form.Subscribe
              selector={(state) => ({
                isDirty: state.isDirty,
                canSubmit: state.canSubmit,
              })}
            >
              {({ isDirty, canSubmit }) => (
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={
                      !canSubmit ||
                      !isDirty ||
                      saveAndRestartMutation.isPending
                    }
                  >
                    {saveAndRestartMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving & Restarting...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save & Restart
                      </>
                    )}
                  </Button>
                </div>
              )}
            </form.Subscribe>
          </form>
        </TabsContent>

        <TabsContent value="appearance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize the look and feel of the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <div className="font-medium">Theme</div>
                  <div className="text-sm text-muted-foreground">
                    Switch between light and dark mode
                  </div>
                </div>
                <ThemeToggle />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
  )
}
