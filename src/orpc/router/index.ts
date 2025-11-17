// Example router - replace with your own routes
import { os, eventIterator, withEventMeta } from '@orpc/server'
import * as z from 'zod'
import { authMiddleware } from '../middleware/auth'

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

// SSE Stream endpoint - streams demo data to authenticated users
export const stream = os
  .use(authMiddleware)
  .output(
    eventIterator(
      z.object({
        id: z.string(),
        type: z.enum(['info', 'success', 'warning', 'error']),
        message: z.string(),
        timestamp: z.number(),
        value: z.number(),
      })
    )
  )
  .handler(async function* ({ context }) {
    const userName = context.user.name || 'User'

    try {
      let eventCount = 0
      
      // Just stream continuously - oRPC will handle connection cleanup
      while (true) {
        eventCount++

        const types = ['info', 'success', 'warning', 'error'] as const
        const messages = [
          `${userName} processed a transaction`,
          `${userName} logged in`,
          `${userName} uploaded a file`,
          'Database query executed',
          'Cache updated',
          `Email sent to ${userName}`,
          `API request from ${userName}`,
          'Background job completed',
        ]

        const data = {
          id: Math.random().toString(36).substring(7),
          type: types[Math.floor(Math.random() * types.length)],
          message: messages[Math.floor(Math.random() * messages.length)],
          timestamp: Date.now(),
          value: Math.floor(Math.random() * 1000),
        }

        // Yield event with metadata for resume support
        yield withEventMeta(data, {
          id: `event-${eventCount}`,
          retry: 5000,
        })

        // Wait 2 seconds before next event
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    } finally {
      console.log('Stream closed for user:', context.user.email)
    }
  })

export default {
  hello,
  stream,
}
