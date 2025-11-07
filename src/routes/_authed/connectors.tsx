import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { connectors } from '@/config/connectors'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  TopNav,
  AppPageWrapper,
  AppPageContentWrapper,
} from '@/components/AppPageWrapper'
import { orpcClient, orpcQuery } from '@/orpc/client'
import { useSuspenseQuery } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'

export const Route = createFileRoute('/_authed/connectors')({
  component: ConnectorsPage,
  loader: async () => {
    return orpcQuery.connectors.listConnections.queryOptions({ input: {} })
  },
})

function ConnectorsPage() {
  const [connecting, setConnecting] = useState<string | null>(null)
  const { data, refetch } = useSuspenseQuery(
    orpcQuery.connectors.listConnections.queryOptions({ input: {} }),
  )

  const handleConnect = async (authConfigId: string, connectorName: string) => {
    console.log(`Initiating connection for ${connectorName} with authConfigId: ${authConfigId}`)

    setConnecting(authConfigId)

    try {
      const result = await orpcClient.connectors.initiateConnection({
        authConfigId,
      })

      console.log('Connection initiated:', result)

      if (result.alreadyConnected) {
        console.log('User already connected:', result.message)
        alert(result.message || 'You are already connected to this connector')
        // Refetch connections to update UI
        refetch()
        return
      }

      if (result.redirectUrl) {
        // Redirect to Composio OAuth flow
        window.location.href = result.redirectUrl
      } else {
        console.warn('No redirect URL received')
      }
    } catch (error) {
      console.error('Error connecting:', error)
      alert(
        `Failed to connect: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      )
    } finally {
      setConnecting(null)
    }
  }

  const connectionStatus = data.connectionStatus || {}

  return (
    <AppPageWrapper>
      <TopNav breadcrumbs={[{ label: 'Connectors' }]} />
      <AppPageContentWrapper className="bg-background py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Connectors
            </h1>
            <p className="text-muted-foreground">
              Connect your accounts to enable tool calls and integrations
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {connectors.map((connector) => {
              const Icon = connector.icon
              const isConnecting = connecting === connector.authConfigId
              const status = connectionStatus[connector.authConfigId]
              const isConnected = status?.isConnected === true

              return (
                <Card key={connector.name}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className="h-6 w-6" />
                        {connector.name}
                      </div>
                      {isConnected && (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Connected
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() =>
                        handleConnect(connector.authConfigId, connector.name)
                      }
                      disabled={isConnecting || isConnected}
                      className="w-full"
                      variant={isConnected ? 'outline' : 'default'}
                    >
                      {isConnecting
                        ? 'Connecting...'
                        : isConnected
                          ? 'Connected'
                          : 'Connect'}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </AppPageContentWrapper>
    </AppPageWrapper>
  )
}

