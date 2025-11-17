import { useEffect, useState, useRef } from 'react'
import { orpcClient } from '@/orpc/client'

export interface StreamData {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
  timestamp: number
  value: number
}

export function useStream() {
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<StreamData[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  const stopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsStreaming(false)
      setIsConnected(false)
    }
  }

  const startStreamManually = () => {
    setIsStreaming(true)
  }

  useEffect(() => {
    if (!isStreaming) return

    const abortController = new AbortController()
    abortControllerRef.current = abortController
    let isActive = true

    const startStream = async () => {
      try {
        setIsConnected(true)
        setError(null)


        // Subscribe to the SSE stream using oRPC
        const iterator = await orpcClient.stream({
          signal: abortController.signal,
        })
        

        for await (const data of iterator) {
          if (!isActive) break

          setMessages((prev) => {
            const newMessages = [data, ...prev]
            // Keep only the last 50 messages
            return newMessages.slice(0, 50)
          })
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('Stream aborted')
        } else {
          console.error('Stream error:', err)
          setError(err.message || 'Stream error occurred')
          setIsConnected(false)
        }
      } finally {
        if (isActive) {
          setIsConnected(false)
        }
      }
    }

    startStream()

    return () => {
      isActive = false
      abortController.abort()
    }
  }, [isStreaming])

  const clearMessages = () => {
    setMessages([])
  }

  return {
    isConnected,
    isStreaming,
    messages,
    error,
    stopStream,
    startStream: startStreamManually,
    clearMessages,
  }
}

