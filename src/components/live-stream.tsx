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
import { diffJson, Change } from 'diff'
import type { CDCEvent } from '@/lib/kafka-cdc-consumer'

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

  const getPreview = (msg: CDCEvent): string => {
    try {
      // For parsed CDC events, show a meaningful preview
      if (msg.type === 'parsed' && msg.value?.payload) {
        const payload = msg.value.payload
        const op = payload.op
        const source = payload.source
        
        let operation = 'Unknown'
        if (op === 'c') operation = 'CREATE'
        else if (op === 'u') operation = 'UPDATE'
        else if (op === 'd') operation = 'DELETE'
        else if (op === 'r') operation = 'READ'
        
        const table = source?.table || 'unknown'
        const db = source?.db || 'unknown'
        
        // Show key info from after or before
        const data = payload.after || payload.before
        if (data) {
          const keys = Object.keys(data).slice(0, 3).join(', ')
          return `${operation} on ${db}.${table} - Fields: ${keys}${Object.keys(data).length > 3 ? '...' : ''}`
        }
        
        return `${operation} on ${db}.${table}`
      }
      
      // Fallback to JSON preview
      const json = JSON.stringify(msg)
      return json.length > 100 ? json.substring(0, 100) + '...' : json
    } catch {
      return String(msg)
    }
  }

  const renderDiff = (msg: CDCEvent) => {
    // Check if this is a parsed CDC event with value payload
    if (msg.type === 'parsed' && msg.value?.payload) {
      const payload = msg.value.payload
      // Treat null as empty object for diffing
      const before = payload.before ?? ''
      const after = payload.after ?? ''

      // Use diffJson for structural JSON comparison
      const diff = diffJson(before, after)

      return (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground mb-2">
            Changes:
          </div>
          <div className="rounded border border-border bg-background font-mono text-xs overflow-auto max-h-96">
            {diff.map((part: Change, index: number) => {
              // GitHub-style colors using theme variables
              const bgColor = part.added
                ? 'bg-diff-addition text-diff-addition-foreground'
                : part.removed
                  ? 'bg-diff-deletion text-diff-deletion-foreground'
                  : 'bg-background text-foreground'

              const borderColor = part.added
                ? 'border-l-diff-addition-border'
                : part.removed
                  ? 'border-l-diff-deletion-border'
                  : 'border-l-transparent'

              const prefix = part.added ? '+' : part.removed ? '-' : ' '

              return (
                <div key={index} className={`${bgColor} border-l-2 ${borderColor}`}>
                  {part.value.split('\n').map((line, lineIndex) => {
                    // Skip the last empty line
                    if (lineIndex === part.value.split('\n').length - 1 && line === '') {
                      return null
                    }
                    return (
                      <div key={lineIndex} className="px-3 py-0.5">
                        <span className="select-none opacity-50 mr-2">{prefix}</span>
                        <span>{line}</span>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )
    }

    // Fallback: show the entire message as JSON
    return (
      <pre className="text-xs font-mono overflow-auto max-h-96">
        {formatJson(msg)}
      </pre>
    )
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
              
              // Get operation type for badge
              let opBadge = null
              if (msg.type === 'parsed' && msg.value?.payload?.op) {
                const op = msg.value.payload.op
                let opLabel = 'Unknown'
                let opVariant: 'default' | 'destructive' | 'outline' | 'secondary' = 'secondary'
                
                if (op === 'c') {
                  opLabel = 'CREATE'
                  opVariant = 'default'
                } else if (op === 'u') {
                  opLabel = 'UPDATE'
                  opVariant = 'secondary'
                } else if (op === 'd') {
                  opLabel = 'DELETE'
                  opVariant = 'destructive'
                } else if (op === 'r') {
                  opLabel = 'READ'
                  opVariant = 'outline'
                }
                
                opBadge = (
                  <Badge variant={opVariant} className="text-xs">
                    {opLabel}
                  </Badge>
                )
              }

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
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {opBadge}
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
                      {renderDiff(msg)}
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
