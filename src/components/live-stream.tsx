import { useStream } from '@/hooks/use-stream'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Trash2, Wifi, WifiOff, Play, Square } from 'lucide-react'
import { formatDistance } from 'date-fns'

export function LiveStream() {
  const {
    isConnected,
    isStreaming,
    messages,
    error,
    stopStream,
    startStream,
    clearMessages,
  } = useStream()

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <Wifi className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Disconnected
                </span>
              </>
            )}
          </div>
          <Badge variant="secondary" className="text-xs">
            {messages.length} events
          </Badge>
        </div>

        <div className="mt-3 flex gap-2">
          {isStreaming ? (
            <Button
              variant="outline"
              size="sm"
              onClick={stopStream}
              className="flex-1"
            >
              <Square className="mr-2 h-3 w-3" />
              Stop Stream
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={startStream}
              className="flex-1"
            >
              <Play className="mr-2 h-3 w-3" />
              Start Stream
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={clearMessages}
            disabled={messages.length === 0}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Messages List */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-2 p-4">
          {error ? (
            <div className="flex h-32 items-center justify-center text-center">
              <div className="space-y-2">
                <p className="text-sm font-medium text-destructive">
                  Stream Error
                </p>
                <p className="text-xs text-muted-foreground">{error}</p>
                <p className="text-xs text-muted-foreground">
                  Please refresh the page to reconnect
                </p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-center">
              <p className="text-sm text-muted-foreground">
                {isConnected
                  ? 'Waiting for data...'
                  : 'Connect to start receiving data'}
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className="rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          msg.type === 'success'
                            ? 'default'
                            : msg.type === 'error'
                              ? 'destructive'
                              : msg.type === 'warning'
                                ? 'default'
                                : 'secondary'
                        }
                        className="text-xs"
                      >
                        {msg.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistance(msg.timestamp, Date.now(), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium">{msg.message}</p>
                    <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Value: {msg.value}</span>
                      <span>ID: {msg.id}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <div className="text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Status:</span>
            <span className={isConnected ? 'text-primary' : ''}>
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span>Updates:</span>
            <span>Every 2s</span>
          </div>
        </div>
      </div>
    </div>
  )
}
