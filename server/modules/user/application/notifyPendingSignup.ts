import type { UserRow } from '../../../infrastructure/db/schema'
import { notifySuperadmin } from '../../../infrastructure/notifications/emailNotifier'
import { env } from '../../../env'

// "Where did this come from" for the operator: which deployment the signup landed on.
// Prefers the canonical prod host, falling back to BASE_URL's host, paired with NODE_ENV
// so a real prod signup is never mistaken for a local test. Prod is always HTTPS (Railway
// terminates TLS); local dev is HTTP.
function environmentReferrer(): { label: string; adminUrl: string } {
  const proto = env.NODE_ENV === 'production' ? 'https' : 'http'
  const host = env.CANONICAL_HOST ?? new URL(env.BASE_URL).host
  return { label: `${env.NODE_ENV} · ${host}`, adminUrl: `${proto}://${host}/admin` }
}

// Ops alert: a brand-new account is pending and needs operator approval. Safe to call
// without awaiting — notifySuperadmin swallows its own errors and never throws.
export async function notifyPendingSignup(user: UserRow): Promise<void> {
  const { label, adminUrl } = environmentReferrer()
  const subject = `Aprendie: new signup awaiting approval — ${user.name}`
  const text = [
    'A new user signed up and is waiting for your approval.',
    '',
    `Name:        ${user.name}`,
    `Email:       ${user.email}`,
    `Signed up:   ${user.createdAt.toISOString()}`,
    `Environment: ${label}`,
    '',
    `Approve them: ${adminUrl}`,
  ].join('\n')
  const html = [
    '<h2>New signup awaiting approval</h2>',
    '<p>A new user signed up and is waiting for your approval.</p>',
    '<table cellpadding="4" style="border-collapse:collapse">',
    `<tr><td><strong>Name</strong></td><td>${user.name}</td></tr>`,
    `<tr><td><strong>Email</strong></td><td>${user.email}</td></tr>`,
    `<tr><td><strong>Signed up</strong></td><td>${user.createdAt.toISOString()}</td></tr>`,
    `<tr><td><strong>Environment</strong></td><td>${label}</td></tr>`,
    '</table>',
    `<p><a href="${adminUrl}">Open the admin users list to approve →</a></p>`,
  ].join('')
  await notifySuperadmin({ subject, text, html })
}
