import { os } from '@orpc/server'
import * as z from 'zod'
import { authMiddleware } from '../middleware/auth'
import { Composio } from '@composio/core'
import { env } from '@/env'

/**
 * Initiate a connection to a connector via Composio
 */
export const initiateConnection = os
  .use(authMiddleware)
  .input(
    z.object({
      authConfigId: z.string().min(1),
    }),
  )
  .handler(async ({ input, context }) => {
    // Initialize Composio SDK
    const composio = new Composio({
      apiKey: env.COMPOSIO_API_KEY,
    })

    // Check if user already has an active connection for this authConfigId
    const existingConnections = await composio.connectedAccounts.list({
      userIds: [context.user.id],
      authConfigIds: [input.authConfigId],
    })

    // Check if there's an active connection
    const activeConnection = existingConnections.items?.find(
      (account) =>
        account.status === 'ACTIVE' &&
        account.authConfig?.id === input.authConfigId,
    )

    if (activeConnection) {
      return {
        alreadyConnected: true,
        connectionId: activeConnection.id,
        message: 'User already has an active connection for this connector',
      }
    }

    // Construct callback URL
    // Try to get origin from headers or use SERVER_URL
    let baseUrl = env.SERVER_URL || 'http://localhost:3000'

    // If we have headers, try to extract origin from them
    if (context.headers) {
      const host = context.headers.get('host')
      const protocol = context.headers.get('x-forwarded-proto') || 'http'
      if (host) {
        baseUrl = `${protocol}://${host}`
      }
    }

    const callbackUrl = `${baseUrl}/connectors`

    const connectionRequest = await composio.connectedAccounts.initiate(
      context.user.id,
      input.authConfigId,
      {
        callbackUrl,
      },
    )

    return {
      alreadyConnected: false,
      redirectUrl: connectionRequest.redirectUrl,
      connectionRequestId: connectionRequest.id,
    }
  })

/**
 * List all connected accounts for the authenticated user
 * Returns connection status mapped by authConfigId
 */
export const listConnections = os
  .use(authMiddleware)
  .input(z.object({}))
  .handler(async ({ context }) => {
    console.log('Listing connections for user:', {
      userId: context.user.id,
    })

    // Initialize Composio SDK
    const composio = new Composio({
      apiKey: env.COMPOSIO_API_KEY,
    })

    const connectedAccounts = await composio.connectedAccounts.list({
      userIds: [context.user.id],
    })

    console.log('User connected accounts:', connectedAccounts)

    // Map connections by authConfigId for easy lookup
    const connectionsByAuthConfigId = new Map<
      string,
      (typeof connectedAccounts.items)[0]
    >()

    connectedAccounts.items.forEach((account) => {
      const authConfigId = account.authConfig?.id
      if (authConfigId) {
        // If there's already a connection for this authConfigId, prefer ACTIVE ones
        const existing = connectionsByAuthConfigId.get(authConfigId)
        if (!existing || account.status === 'ACTIVE') {
          connectionsByAuthConfigId.set(authConfigId, account)
        }
      }
    })

    // Convert to object for easier access
    const connectionStatus: Record<
      string,
      {
        isConnected: boolean
        status: string
        connectionId?: string
      }
    > = {}

    // Get all authConfigIds from connectors to check their status
    // We'll populate this with all connectors, showing which ones are connected
    connectedAccounts.items?.forEach((account) => {
      const authConfigId = account.authConfig?.id
      if (authConfigId) {
        connectionStatus[authConfigId] = {
          isConnected: account.status === 'ACTIVE',
          status: account.status,
          connectionId: account.id,
        }
      }
    })

    return {
      connections: connectedAccounts.items || [],
      connectionStatus,
    }
  })
