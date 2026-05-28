import { defineConfig } from 'drizzle-kit'

const url =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/guess_and_correct'
const isLocalDb = url.includes('localhost') || url.includes('127.0.0.1')

export default defineConfig({
  schema: './server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url,
    ssl: isLocalDb ? false : { rejectUnauthorized: false },
  },
})
