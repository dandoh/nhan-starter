import { defineConfig } from 'drizzle-kit'

// Build database URL from environment variables (matching docker-compose)
function getDatabaseUrl() {
  const user = process.env.MYSQL_USER
  const password = process.env.MYSQL_PASSWORD
  const host = process.env.MYSQL_HOST
  const port = process.env.MYSQL_PORT
  const database = process.env.MYSQL_DATABASE

  const result = `mysql://${user}:${password}@${host}:${port}/${database}`
  return result
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'mysql',
  dbCredentials: {
    url: getDatabaseUrl(),
  },
  verbose: true,
  strict: true,
})
