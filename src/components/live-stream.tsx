import { useState } from 'react'
import { useStream } from '@/hooks/use-stream'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Trash2,
  Wifi,
  WifiOff,
  Play,
  Square,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
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

  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(
    new Set(),
  )

  const toggleExpand = (messageId: string) => {
    setExpandedMessages((prev) => {
      const next = new Set(prev)
      if (next.has(messageId)) {
        next.delete(messageId)
      } else {
        next.add(messageId)
      }
      return next
    })
  }

  const formatJson = (obj: any): string => {
    try {
      return JSON.stringify(obj, null, 2)
    } catch {
      return String(obj)
    }
  }

  const getPreview = (msg: any): string => {
    try {
      const json = JSON.stringify(msg)
      return json.length > 100 ? json.substring(0, 100) + '...' : json
    } catch {
      return String(msg)
    }
  }

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
                  ? 'Waiting for CDC events...'
                  : 'Connect to start receiving CDC events'}
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const messageId = `${msg.topic}-${msg.offset}`
              const isExpanded = expandedMessages.has(messageId)
              const preview = getPreview(msg)

              return (
                <div
                  key={messageId}
                  className="rounded-lg border border-border bg-card transition-colors hover:bg-accent"
                >
                  <button
                    onClick={() => toggleExpand(messageId)}
                    className="w-full p-3 text-left"
                  >
                    <div className="flex items-start gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs">
                            {msg.topic}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistance(
                              new Date(Number(msg.timestamp)),
                              Date.now(),
                              {
                                addSuffix: true,
                              },
                            )}
                          </span>
                        </div>
                        <pre className="text-xs text-muted-foreground font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                          {preview}
                        </pre>
                      </div>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-border p-3 bg-muted/30">
                      <pre className="text-xs font-mono overflow-auto max-h-96">
                        {formatJson(msg)}
                      </pre>
                    </div>
                  )}
                </div>
              )
            })
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
            <span>Source:</span>
            <span>Kafka CDC</span>
          </div>
        </div>
      </div>
    </div>
  )
}
