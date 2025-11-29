// Example router - replace with your own routes
import { os } from '@orpc/server'
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

export default {
  hello,
}
