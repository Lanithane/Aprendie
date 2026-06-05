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
  // Which DB the effective DATABASE_URL points at, independent of NODE_ENV. Lets
  // `npm run prod` target the prod DB while staying a local dev runtime (NODE_ENV
  // stays 'development', so cookies aren't secure-only and HSTS isn't sent). On
  // Railway this is unset and NODE_ENV=production selects prod (see below).
  DB_TARGET: z.enum(['local', 'prod']).optional(),
  // Required: server cannot operate securely without these.
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be 32+ chars'),
  // Required when auth is wired; left optional now to allow early local boot.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  // The account whose email matches this is promoted to `admin` on login.
  // Optional: when unset, no account is auto-promoted.
  ADMIN_EMAIL: z.string().email().optional(),
  // The single operator-supplied Anthropic key all approved users spend against.
  // Required for any spend path (sentence generation, grading, translation): the
  // operator-key client throws when it's unset. Optional here only so the server can
  // still boot for non-spend work (auth, history) during early local dev.
  OPERATOR_ANTHROPIC_KEY: z.string().optional(),
  // Session cookie domain. Set to a registrable domain with a leading dot
  // (e.g. `.aprendie.com`) to share the login across the apex and `www` (and any
  // subdomain). Unset = host-only cookie (correct for localhost / single-host).
  COOKIE_DOMAIN: z.string().optional(),
  // The public host to land on. When set (e.g. `aprendie.com`), requests that
  // arrive on the bare Railway origin (`*.up.railway.app`) are 301'd here so the
  // app is only ever reached under its real domain. www and the apex are both
  // legit and pass through untouched; only the railway origin is rewritten.
  CANONICAL_HOST: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('[env] invalid environment configuration:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

// Resolve the effective DB URL once, so the rest of the app keeps reading `env.DATABASE_URL`.
// Target prod when DB_TARGET=prod (e.g. `npm run prod` / `db:migrate:prod`) or when actually
// running in production (Railway). Otherwise prefer DATABASE_URL_LOCAL, falling back to
// DATABASE_URL if no local URL is configured.
const useProdDb = parsed.data.DB_TARGET === 'prod' || parsed.data.NODE_ENV === 'production'
const resolvedDatabaseUrl = useProdDb
  ? parsed.data.DATABASE_URL
  : (parsed.data.DATABASE_URL_LOCAL ?? parsed.data.DATABASE_URL)

export const env = { ...parsed.data, DATABASE_URL: resolvedDatabaseUrl }
