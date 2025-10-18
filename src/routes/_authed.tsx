import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { createIsomorphicFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '@/auth/auth-config'
import { authClient } from '@/auth/auth-client'

type SessionData = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>

export type AuthContext = {
  session: SessionData['session']
  user: SessionData['user']
}

// Isomorphic function to check authentication
const getAuthSession = createIsomorphicFn()
  .server(async () => {
    const headers = getRequestHeaders()
    const sessionData = await auth.api.getSession({ headers })
    return sessionData
  })
  .client(async () => {
    // On client, use the auth client
    const sessionData = await authClient.getSession()
    return sessionData.data
  })

export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ location }) => {
    // Check if user is authenticated
    const sessionData = await getAuthSession()

    if (!sessionData) {
      // Redirect to login page if not authenticated
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      })
    }

    // Return session and user in context for child routes
    return {
      session: sessionData.session,
      user: sessionData.user,
    } satisfies AuthContext
  },
  component: AuthedLayout,
})

function AuthedLayout() {
  return <Outlet />
}

export function useAuthContext() {
  return Route.useRouteContext()
}
