import { defineConfig } from 'drizzle-kit';

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

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: getDatabaseUrl(),
  },
  verbose: true,
  strict: true,
});

