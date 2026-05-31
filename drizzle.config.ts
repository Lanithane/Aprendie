import { defineConfig } from 'drizzle-kit'

// Mirror server/env.ts: target prod when DB_TARGET=prod or NODE_ENV=production, else prefer
// DATABASE_URL_LOCAL. Drives `db:generate` / `db:studio`, so locally they target the local DB.
const useProdDb = process.env.DB_TARGET === 'prod' || process.env.NODE_ENV === 'production'
const url =
  (useProdDb
    ? process.env.DATABASE_URL
    : (process.env.DATABASE_URL_LOCAL ?? process.env.DATABASE_URL)) ??
  'postgresql://postgres:postgres@localhost:5432/aprendie'
const isLocalDb = url.includes('localhost') || url.includes('127.0.0.1')

export default defineConfig({
  schema: './server/infrastructure/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url,
    ssl: isLocalDb ? false : { rejectUnauthorized: false },
  },
})
