import { createMiddleware } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '@/auth/auth-config'

/**
 * Authentication middleware for server functions.
 * Checks if the user is authenticated and adds user and session to the context.
 * Throws an error if no valid session is found.
 */
export const authMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const headers = getRequestHeaders()
    const sessionData = await auth.api.getSession({ headers })

    if (!sessionData) {
      throw new Error('Unauthorized')
    }

    return next({
      context: { user: sessionData.user, session: sessionData.session },
    })
  },
)
