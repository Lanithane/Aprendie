import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  BASE_URL: z.string().url().default('http://localhost:3000'),
  // Required for DB-touching code; optional here so the server can boot
  // during early scaffolding before Postgres is wired.
  DATABASE_URL: z.string().optional(),
  // Required: server cannot operate securely without these.
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be 32+ chars'),
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be 32+ chars (base64 of 32 bytes)'),
  // Optional previous master key (base64 of 32 bytes). Set during key rotation so
  // ciphertexts written under the old key stay readable; they re-encrypt to the
  // current key on next read. Remove once all blobs have rotated forward.
  ENCRYPTION_KEY_PREVIOUS: z.string().min(32).optional(),
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

export const env = parsed.data
