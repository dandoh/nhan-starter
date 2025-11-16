import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import * as schema from './schema'

// Build database connection config from environment variables (matching docker-compose)
function getDatabaseConfig() {
  return {
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'nhan_user',
    password: process.env.MYSQL_PASSWORD || 'nhan_password',
    database: process.env.MYSQL_DATABASE || 'nhan_starter_dev',
  }
}

// Create mysql client (server-side only)
export const client = mysql.createPool(getDatabaseConfig())

// Create drizzle instance (server-side only)
export const db = drizzle(client, { schema, mode: 'default' })

// Export schema for convenience
export { schema }
