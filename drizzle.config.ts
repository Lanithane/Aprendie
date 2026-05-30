import { defineConfig } from 'drizzle-kit'

// Mirror server/env.ts: production → DATABASE_URL, otherwise prefer DATABASE_URL_LOCAL.
// Drives `db:generate` / `db:studio`, so locally they target the local DB.
const url =
  (process.env.NODE_ENV === 'production'
    ? process.env.DATABASE_URL
    : (process.env.DATABASE_URL_LOCAL ?? process.env.DATABASE_URL)) ??
  'postgresql://postgres:postgres@localhost:5432/guess_and_correct'
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
