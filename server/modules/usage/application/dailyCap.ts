import type { UserRow } from '../../../infrastructure/db/schema'
import * as usageRepository from '../persistence/usageRepository'
import { getDailyCapFor } from '../../settings/application/appSettings'
import { DailyCapExceededError } from '../domain/errors'
import { notifyDailyCapReached } from './notifyDailyCapReached'

// Throws DailyCapExceededError if the user has already hit today's cap. A `capExemptUntil`
// in the future is a temporary "uncap for a bit" and skips the check entirely; otherwise the
// applicable cap is the per-user override (if any) or the global cap from settings.
export async function assertWithinDailyCap(
  user: Pick<UserRow, 'id' | 'capExemptUntil' | 'dailyCapOverride'>
): Promise<void> {
  if (user.capExemptUntil && user.capExemptUntil.getTime() > Date.now()) return
  const cap = await getDailyCapFor(user)
  const used = await usageRepository.countToday(user.id)
  if (used >= cap) throw new DailyCapExceededError(cap)
}

// Records one graded sentence against today's counter. When a capped user (non-admin, not
// temporarily exempt) crosses their cap with this sentence, emails the operator once: the new
// count equalling the cap fires exactly on the crossing, so the repeat attempts that follow —
// blocked upstream by assertWithinDailyCap — never re-notify. Counting still happens for everyone
// (incl. admins) so the admin "Graded today" tile stays accurate.
export async function recordGradedSentence(
  user: Pick<UserRow, 'id' | 'name' | 'email' | 'role' | 'capExemptUntil' | 'dailyCapOverride'>
): Promise<void> {
  const newCount = await usageRepository.incrementToday(user.id)
  if (user.role === 'admin') return
  if (user.capExemptUntil && user.capExemptUntil.getTime() > Date.now()) return
  const cap = await getDailyCapFor(user)
  if (newCount === cap) void notifyDailyCapReached(user, cap)
}
