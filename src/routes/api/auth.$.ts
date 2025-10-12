import '@/polyfill'
import { createFileRoute } from '@tanstack/react-router'
import { auth } from '@/auth/auth-config'

async function handle({ request }: { request: Request }) {
  return auth.handler(request)
}

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
    },
  },
})
