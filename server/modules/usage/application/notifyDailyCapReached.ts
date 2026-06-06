import type { UserRow } from '../../../infrastructure/db/schema'
import { notifySuperadmin } from '../../../infrastructure/notifications/emailNotifier'
import { deploymentContext } from '../../../infrastructure/notifications/notificationEnv'

// Ops alert: a capped user just reached today's graded-sentence cap on the operator key. Fired
// once per user per day, the moment they cross the limit (see recordGradedSentence). Safe to call
// without awaiting — notifySuperadmin swallows its own errors and never throws.
export async function notifyDailyCapReached(
  user: Pick<UserRow, 'name' | 'email'>,
  cap: number
): Promise<void> {
  const { label, adminUrl } = deploymentContext()
  const reachedAt = new Date().toISOString()
  const subject = `Aprendie: ${user.name} hit today's daily cap (${cap})`
  const text = [
    `${user.name} just reached today's graded-sentence cap.`,
    '',
    `Name:        ${user.name}`,
    `Email:       ${user.email}`,
    `Daily cap:   ${cap}`,
    `Reached:     ${reachedAt}`,
    `Environment: ${label}`,
    '',
    `Adjust their cap: ${adminUrl}`,
  ].join('\n')
  const html = [
    '<h2>Daily cap reached</h2>',
    `<p><strong>${user.name}</strong> just reached today's graded-sentence cap.</p>`,
    '<table cellpadding="4" style="border-collapse:collapse">',
    `<tr><td><strong>Name</strong></td><td>${user.name}</td></tr>`,
    `<tr><td><strong>Email</strong></td><td>${user.email}</td></tr>`,
    `<tr><td><strong>Daily cap</strong></td><td>${cap}</td></tr>`,
    `<tr><td><strong>Reached</strong></td><td>${reachedAt}</td></tr>`,
    `<tr><td><strong>Environment</strong></td><td>${label}</td></tr>`,
    '</table>',
    `<p><a href="${adminUrl}">Open the admin users list to adjust their cap →</a></p>`,
  ].join('')
  await notifySuperadmin({ subject, text, html })
}
