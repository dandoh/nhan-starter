import { defineConfig } from 'drizzle-kit';

// Build database URL from environment variables (matching docker-compose)
function getDatabaseUrl() {
  const user = process.env.MYSQL_USER || 'nhan_user'
  const password = process.env.MYSQL_PASSWORD || 'nhan_password'
  const host = process.env.MYSQL_HOST || 'localhost'
  const port = process.env.MYSQL_PORT || '3306'
  const database = process.env.MYSQL_DATABASE || 'nhan_starter_dev'

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
});

