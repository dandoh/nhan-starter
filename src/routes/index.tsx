import { createFileRoute, Link } from '@tanstack/react-router'
import { orpcQuery } from '@/orpc/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
  Square,
  RotateCw,
  Settings,
} from 'lucide-react'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function InfrastructureStatusTest() {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery(
    orpcQuery.infrastructureStatus.queryOptions({
      refetchInterval: 3000, // Poll every 3 seconds
    }),
  )

  const startMutation = useMutation(
    orpcQuery.infrastructureStart.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpcQuery.infrastructureStatus.queryKey(),
        })
      },
    }),
  )

  const stopMutation = useMutation(
    orpcQuery.infrastructureStop.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpcQuery.infrastructureStatus.queryKey(),
        })
      },
    }),
  )

  const restartMutation = useMutation(
    orpcQuery.infrastructureRestart.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: orpcQuery.infrastructureStatus.queryKey(),
        })
      },
    }),
  )

  if (isLoading) {
    return (
      <Alert>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertTitle>Checking infrastructure...</AlertTitle>
        <AlertDescription>
          Please wait while we check the CDC infrastructure status.
        </AlertDescription>
      </Alert>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to check infrastructure status: {error.message}
        </AlertDescription>
      </Alert>
    )
  }

  // Check for missing dependencies
  if (!data?.docker.available) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Docker Not Running</AlertTitle>
        <AlertDescription>
          Docker is not running or not installed. Please start Docker Desktop
          first.
        </AlertDescription>
      </Alert>
    )
  }

  if (!data?.dockerCompose.available) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Docker Compose Not Available</AlertTitle>
        <AlertDescription>
          docker-compose is not installed. Please install Docker Compose to
          continue.
        </AlertDescription>
      </Alert>
    )
  }

  // Infrastructure not running
  if (!data?.ready) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Infrastructure Not Running</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>
            Kafka Connect is not running. Click the button to start it
            automatically.
          </span>
          <Button
            onClick={() =>
              startMutation.mutate(undefined, {
                onSuccess: () => {
                  queryClient.invalidateQueries({
                    queryKey: orpcQuery.infrastructureStatus.queryKey(),
                  })
                },
              })
            }
            disabled={startMutation.isPending}
            size="sm"
            className="shrink-0"
          >
            {startMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Start Infrastructure
              </>
            )}
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  // Infrastructure running
  return (
    <Alert className="bg-primary/10 border-primary/40">
      <CheckCircle2 className="h-4 w-4 text-primary" />
      <AlertTitle className="text-primary">Infrastructure Ready</AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-4">
        <span>
          Kafka Connect is running and healthy at {data.kafkaConnect.url}
        </span>
        <div className="flex gap-2 shrink-0">
          <Button
            onClick={() => restartMutation.mutate(undefined)}
            disabled={restartMutation.isPending}
            variant="outline"
            size="sm"
          >
            {restartMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Restarting...
              </>
            ) : (
              <>
                <RotateCw className="h-4 w-4 mr-2" />
                Restart
              </>
            )}
          </Button>
          <Button
            onClick={() => stopMutation.mutate(undefined)}
            disabled={stopMutation.isPending}
            variant="destructive"
            size="sm"
          >
            {stopMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Stopping...
              </>
            ) : (
              <>
                <Square className="h-4 w-4 mr-2" />
                Stop
              </>
            )}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}

function HomePage() {
  return (
    <div className="flex h-full w-full flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">CDC Streamer</h1>
        <Link to="/config">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </Link>
      </div>
      <InfrastructureStatusTest />
    </div>
  )
}
