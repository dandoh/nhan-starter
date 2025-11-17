// Example router - replace with your own routes
import { os, eventIterator, withEventMeta } from '@orpc/server'
import * as z from 'zod'
import { authMiddleware } from '../middleware/auth'
import { createCDCConsumer, type CDCEvent } from '@/lib/kafka-cdc-consumer'

// Example: Simple hello world route
export const hello = os
  .use(authMiddleware)
  .input(z.object({ name: z.string().optional() }))
  .handler(({ input, context }) => {
    return {
      message: `Hello, ${input.name || context.user.name || 'World'}!`,
      userId: context.user.id,
    }
  })

// SSE Stream endpoint - streams CDC events from Kafka
export const stream = os
  .use(authMiddleware)
  // .output(eventIterator(z.any())) // Raw JSON output
  .handler(async function* ({ context }) {
    let eventCount = 0
    let consumer: Awaited<ReturnType<typeof createCDCConsumer>> | null = null

    try {
      // Determine broker based on environment
      // When running in Docker, use service name; otherwise localhost
      const broker =
        process.env.KAFKA_BROKER || 'localhost:9092'

      console.log(
        `Starting CDC stream for user: ${context.user.email} (broker: ${broker})`
      )

      // Create unique consumer group per user session
      const groupId = `cdc-stream-${context.user.id}-${Date.now()}`

      // Queue for buffering messages between Kafka callback and generator
      const messageQueue: CDCEvent[] = []
      let messageResolver: ((value: CDCEvent | null) => void) | null = null
      let streamError: Error | null = null

      // Create consumer with callback
      consumer = await createCDCConsumer(
        async (event) => {
          // If there's a waiting resolver, resolve it immediately
          if (messageResolver) {
            messageResolver(event)
            messageResolver = null
          } else {
            // Otherwise, queue the message
            messageQueue.push(event)
          }
        },
        {
          broker,
          groupId,
          fromBeginning: true,
        }
      )

      // Yield messages as they arrive
      while (true) {
        // Check for errors
        if (streamError) {
          throw streamError
        }

        // Yield queued messages first
        if (messageQueue.length > 0) {
          const event = messageQueue.shift()!
          eventCount++

          // Yield event with metadata for resume support
          yield withEventMeta(event, {
            id: `cdc-event-${eventCount}-${event.offset}`,
          })
          continue
        }

        // Wait for next message with a timeout to allow generator to be cancelled
        const message = await Promise.race<CDCEvent | null>([
          new Promise<CDCEvent | null>((resolve) => {
            messageResolver = resolve
          }),
          new Promise<null>((resolve) => {
            setTimeout(() => {
              if (messageResolver) {
                messageResolver(null)
                messageResolver = null
              }
              resolve(null)
            }, 100)
          }),
        ])

        if (message) {
          eventCount++

          // Yield event with metadata for resume support
          yield withEventMeta(message, {
            id: `cdc-event-${eventCount}-${message.offset}`,
          })
        }
      }
    } catch (error) {
      console.error('CDC stream error for user:', context.user.email, error)
      throw error
    } finally {
      console.log(
        `CDC stream closed for user: ${context.user.email} (events: ${eventCount})`
      )
      // Clean up consumer
      if (consumer) {
        await consumer.disconnect()
      }
    }
  })

export default {
  hello,
  stream,
}
