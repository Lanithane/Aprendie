import { Resend } from 'resend'
import { env } from '../../env'

// Lazily built so the server still boots without RESEND_API_KEY — getClient() then
// returns null and sends no-op. Mirrors the operator-key client's "configured or skip"
// posture (infrastructure/claude/anthropicClient.ts).
let client: Resend | null = null
function getClient(): Resend | null {
  if (!env.RESEND_API_KEY) return null
  client ??= new Resend(env.RESEND_API_KEY)
  return client
}

export interface SuperadminEmail {
  subject: string
  text: string
  html?: string
}

// Sends a transactional email to the single configured operator (SUPERADMIN_EMAIL).
// Never throws: a notification is a side-channel, so a missing key or a Resend failure
// must not break the request that triggered it. No-ops (with a warn) when Resend or the
// recipient isn't configured, so local/non-prod boots without keys are fine.
export async function notifySuperadmin(message: SuperadminEmail): Promise<void> {
  const resend = getClient()
  if (!resend || !env.SUPERADMIN_EMAIL) {
    console.warn(
      `[notifications] Resend/SUPERADMIN_EMAIL not configured — skipping email: ${message.subject}`
    )
    return
  }
  try {
    const { error } = await resend.emails.send({
      from: env.RESEND_FROM,
      to: env.SUPERADMIN_EMAIL,
      subject: message.subject,
      text: message.text,
      ...(message.html ? { html: message.html } : {}),
    })
    if (error) console.error('[notifications] superadmin email failed:', error)
  } catch (err) {
    console.error('[notifications] superadmin email threw:', err)
  }
}
