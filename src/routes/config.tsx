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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Save, AlertCircle } from 'lucide-react'
import { cdcConfigSchema, type CDCConfig } from '@/lib/schemas'

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
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <div className="container mx-auto max-w-4xl p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Infrastructure Configuration</h1>
          <p className="text-muted-foreground mt-2">
            Manage your CDC infrastructure settings
          </p>
        </div>

        {saveAndRestartMutation.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{String(saveAndRestartMutation.error)}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Project Settings</CardTitle>
            <CardDescription>Basic project configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kafka Configuration</CardTitle>
            <CardDescription>Apache Kafka broker settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kafka Connect Configuration</CardTitle>
            <CardDescription>Debezium Kafka Connect settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
      </div>
    </form>
  )
}
