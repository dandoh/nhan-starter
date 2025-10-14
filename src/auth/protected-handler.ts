import { auth } from './auth-config'

type SessionData = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>

type ProtectedHandlerContext<TParams = Record<string, string>> = {
  request: Request
  session: SessionData['session']
  user: SessionData['user']
  params: TParams
}

type HandlerFunction<TParams = Record<string, string>> = (
  context: ProtectedHandlerContext<TParams>,
) => Response | Promise<Response>

/**
 * Creates a protected API route handler that automatically checks authentication
 * @param handler - The handler function that receives session, user, request, and params
 * @returns A wrapped handler that returns 401 if not authenticated
 */
export function createProtectedHandler<TParams = Record<string, string>>(
  handler: HandlerFunction<TParams>,
) {
  return async ({ request, params }: { request: Request; params: TParams }) => {
    // Get the session from better-auth
    const sessionData = await auth.api.getSession({ headers: request.headers })

    // Return 401 if no valid session
    if (!sessionData) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Authentication required',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )
    }

    // Call the handler with authenticated context
    return handler({
      request,
      session: sessionData.session,
      user: sessionData.user,
      params,
    })
  }
}
