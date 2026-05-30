import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  BASE_URL: z.string().url().default('http://localhost:3000'),
  // Two DB URLs; the effective one is resolved below by NODE_ENV. Both optional here so the
  // server can boot during early scaffolding before Postgres is wired.
  //   - DATABASE_URL: production DB (also the var Railway injects in prod).
  //   - DATABASE_URL_LOCAL: local dev/test DB; preferred when NODE_ENV !== 'production'.
  DATABASE_URL: z.string().optional(),
  DATABASE_URL_LOCAL: z.string().optional(),
  // Required: server cannot operate securely without these.
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be 32+ chars'),
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be 32+ chars (base64 of 32 bytes)'),
  // Required when auth is wired; left optional now to allow early local boot.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  // The account whose email matches this is promoted to `admin` on login.
  // Optional: when unset, no account is auto-promoted.
  ADMIN_EMAIL: z.string().email().optional(),
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('[env] invalid environment configuration:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

// Resolve the effective DB URL once, so the rest of the app keeps reading `env.DATABASE_URL`.
// In production use DATABASE_URL; otherwise prefer DATABASE_URL_LOCAL, falling back to
// DATABASE_URL if no local URL is configured.
const resolvedDatabaseUrl =
  parsed.data.NODE_ENV === 'production'
    ? parsed.data.DATABASE_URL
    : (parsed.data.DATABASE_URL_LOCAL ?? parsed.data.DATABASE_URL)

export const env = { ...parsed.data, DATABASE_URL: resolvedDatabaseUrl }
