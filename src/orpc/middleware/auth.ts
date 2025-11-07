import { os, ORPCError } from '@orpc/server'
import { auth } from '@/auth/auth-config'

/**
 * Authentication middleware for oRPC routes.
 * Checks if the user is authenticated and adds user and session to the context.
 * Throws 401 UNAUTHORIZED if no valid session is found.
 */
export const authMiddleware = os
  .$context<{ headers?: Headers; user?: { id: string } }>()
  .middleware(async ({ context, next }) => {
    if (context.user) {
      return next({
        context: {
          user: context.user,
          headers: context.headers,
        },
      })
    }

    if (!context.headers) {
      throw new ORPCError('UNAUTHORIZED', {
        message: 'Auth headers missing',
      })
    }

    // Get the session from better-auth
    const sessionData = await auth.api.getSession({
      headers: context.headers,
    })

    // Throw 401 if no valid session
    if (!sessionData) {
      throw new ORPCError('UNAUTHORIZED')
    }

    // Add user and session to context via output function
    return next({
      context: {
        user: sessionData.user,
        headers: context.headers,
        // session: sessionData.session,
      },
    })
  })
