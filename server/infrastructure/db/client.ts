import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { env } from '../../env'

if (!env.DATABASE_URL) {
  throw new Error('[db] DATABASE_URL is required for the DB client')
}

const isLocalDb =
  env.DATABASE_URL.includes('localhost') || env.DATABASE_URL.includes('127.0.0.1')

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  ssl: isLocalDb ? false : { rejectUnauthorized: false },
})
export const db = drizzle(pool)
