import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Database, Loader2, Play, Square, Trash2 } from 'lucide-react'
import { orpcQuery } from '@/orpc/client'
import { useQuery } from '@tanstack/react-query'
import { LiveStream } from '@/components/live-stream'
import { Badge } from '@/components/ui/badge'
import { useStream } from '@/hooks/use-stream'

export const Route = createFileRoute('/connector/$id')({
  component: ConnectorStreamPage,
})

function ConnectorStreamPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()

  // Fetch connector details
  const { data: connector, isLoading: isConnectorLoading, error: connectorError } = useQuery(
    orpcQuery.getConnectorById.queryOptions({ input: { id } }),
  )

  // Initialize stream hook
  // We pass an empty string as default topicPrefix if connector is not loaded yet
  // The hook handles cleanup when topicPrefix changes
  const {
    isConnected,
    isStreaming,
    messages,
    error: streamError,
    stopStream,
    startStream,
    clearMessages,
  } = useStream({ 
    topicPrefix: connector?.topicPrefix || '' 
  })

  if (isConnectorLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (connectorError || !connector) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <Database className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Connector not found</h2>
        <p className="text-sm text-muted-foreground">
          The connector you're looking for doesn't exist.
        </p>
        <Button onClick={() => navigate({ to: '/' })}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Connectors
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        {/* Top Row */}
        <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
          <Link to="/" className="shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <h1 className="text-sm sm:text-base font-semibold truncate">{connector.name}</h1>
            <Badge variant="secondary" className="text-[10px] sm:text-xs font-normal shrink-0 h-5">
              {connector.dbType}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isConnected ? (
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-green-500"></span>
                </span>
                <span className="text-[10px] sm:text-xs text-green-600 font-medium hidden sm:inline">Live</span>
              </div>
            ) : (
              <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">Off</span>
            )}
            
            <span className="text-[10px] sm:text-xs text-muted-foreground font-mono tabular-nums">
              {messages.length}
            </span>

            <div className="h-3 sm:h-4 w-px bg-border" />

            {isStreaming ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={stopStream}
                className="h-6 sm:h-7 text-destructive hover:text-destructive hover:bg-destructive/10 px-1.5 sm:px-2"
              >
                <Square className="h-3 w-3" />
                <span className="hidden sm:inline ml-1.5">Stop</span>
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={startStream}
                className="h-6 sm:h-7 text-primary hover:text-primary hover:bg-primary/10 px-1.5 sm:px-2"
              >
                <Play className="h-3 w-3" />
                <span className="hidden sm:inline ml-1.5">Start</span>
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={clearMessages}
              disabled={messages.length === 0}
              className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground hover:text-destructive"
              title="Clear Messages"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Bottom Row - Connection Details */}
        <div className="px-3 pb-2 sm:px-4 sm:pb-2.5 flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground border-t border-border/30">
          <Database className="h-3 w-3 shrink-0 hidden sm:inline-block" />
          <span className="font-mono truncate">
            {connector.host}:{connector.port}
          </span>
          <span className="text-muted-foreground/40 shrink-0">/</span>
          <span className="font-mono truncate">{connector.database}</span>
        </div>
      </header>

      {/* Stream Content */}
      <div className="flex-1 overflow-hidden bg-muted/5">
        <LiveStream 
          messages={messages} 
          isConnected={isConnected} 
          error={streamError} 
        />
      </div>
    </div>
  )
}
