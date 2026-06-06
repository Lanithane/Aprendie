import { env } from '../../env'

// Operator-facing deployment context for ops emails: a human label ("production · aprendie.com")
// and the admin URL, so an alert names which deployment it came from and links straight to admin.
// Prefers the canonical prod host, falling back to BASE_URL's host, paired with NODE_ENV so a real
// prod event is never mistaken for a local test. Prod is always HTTPS (Railway terminates TLS);
// local dev is HTTP.
export function deploymentContext(): { label: string; adminUrl: string } {
  const proto = env.NODE_ENV === 'production' ? 'https' : 'http'
  const host = env.CANONICAL_HOST ?? new URL(env.BASE_URL).host
  return { label: `${env.NODE_ENV} · ${host}`, adminUrl: `${proto}://${host}/admin` }
}
