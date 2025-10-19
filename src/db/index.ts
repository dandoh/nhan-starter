import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Build database URL from environment variables (matching docker-compose)
function getDatabaseUrl() {
  const user = process.env.POSTGRES_USER || 'postgres'
  const password = process.env.POSTGRES_PASSWORD || 'postgres'
  const host = process.env.POSTGRES_HOST || 'localhost'
  const port = process.env.POSTGRES_PORT || '5432'
  const database = process.env.POSTGRES_DB || 'nhan_starter_dev'

  const result = `postgresql://${user}:${password}@${host}:${port}/${database}`
  return result
}

// Create postgres client (server-side only)
export const client = postgres(getDatabaseUrl())

// Create drizzle instance (server-side only)
export const db = drizzle(client, { schema })

// Export schema for convenience
export { schema }
