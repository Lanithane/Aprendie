import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { env } from '../env'

if (!env.DATABASE_URL) {
  throw new Error('[db] DATABASE_URL is required for the DB client')
}

export const pool = new pg.Pool({ connectionString: env.DATABASE_URL })
export const db = drizzle(pool)
