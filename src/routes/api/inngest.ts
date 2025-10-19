import '@/polyfill'

import { createFileRoute } from '@tanstack/react-router'
import { serve } from 'inngest/edge'
import { inngest } from '@/inngest/client'
import { functions } from '@/inngest'

/**
 * Inngest webhook endpoint
 * For local dev: npx inngest-cli@latest dev
 * The dev server will communicate with this endpoint at /api/inngest
 */
const handler = serve({ client: inngest, functions })

async function handleGet({ request }: { request: Request }) {
  return handler(request)
}

async function handlePost({ request }: { request: Request }) {
  return handler(request)
}

async function handlePut({ request }: { request: Request }) {
  return handler(request)
}

export const Route = createFileRoute('/api/inngest')({
  server: {
    handlers: {
      GET: handleGet,
      POST: handlePost,
      PUT: handlePut,
    },
  },
})
