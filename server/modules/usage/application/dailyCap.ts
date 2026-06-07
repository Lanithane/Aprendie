import type { UserRow } from '../../../infrastructure/db/schema'
import * as usageRepository from '../persistence/usageRepository'
import { getDailyCapFor } from '../../settings/application/appSettings'
import { DailyCapExceededError } from '../domain/errors'
import type { DailyUsageSnapshot } from '../domain/DailyUsage'
import { notifyDailyCapReached } from './notifyDailyCapReached'

// A future `capExemptUntil` is a temporary "uncap for a bit" — the cap doesn't apply while it lasts.
function isExempt(user: Pick<UserRow, 'capExemptUntil'>): boolean {
  return !!(user.capExemptUntil && user.capExemptUntil.getTime() > Date.now())
}

// Whether a per-day cap is actually enforced for this account: everyone except admins (so the
// operator can't lock themselves out) and the temporarily exempt.
function isCapped(user: Pick<UserRow, 'role' | 'capExemptUntil'>): boolean {
  return user.role !== 'admin' && !isExempt(user)
}

// Throws DailyCapExceededError if the user has already hit today's cap. An exempt account skips the
// check entirely; otherwise the applicable cap is the per-user override (if any) or the global cap.
export async function assertWithinDailyCap(
  user: Pick<UserRow, 'id' | 'capExemptUntil' | 'dailyCapOverride'>
): Promise<void> {
  if (isExempt(user)) return
  const cap = await getDailyCapFor(user)
  const used = await usageRepository.countToday(user.id)
  if (used >= cap) throw new DailyCapExceededError(cap)
}

// The account's current daily-cap posture (today's count + the applicable cap + whether a cap is
// enforced), for the UI's own near-cap warning. Backs GET /api/usage/me on page load; the grade
// paths return a fresher snapshot in their response (see recordGradedSentence) so the banner
// updates without a refetch.
export async function getDailyUsage(
  user: Pick<UserRow, 'id' | 'role' | 'capExemptUntil' | 'dailyCapOverride'>
): Promise<DailyUsageSnapshot> {
  const cap = await getDailyCapFor(user)
  const usedToday = await usageRepository.countToday(user.id)
  return { usedToday, cap, capped: isCapped(user) }
}

// Records one graded sentence against today's counter and returns the resulting snapshot. When a
// capped user crosses their cap with this sentence, emails the operator once: the new count equalling
// the cap fires exactly on the crossing, so the repeat attempts that follow — blocked upstream by
// assertWithinDailyCap — never re-notify. Counting still happens for everyone (incl. admins) so the
// admin "Graded today" tile stays accurate.
export async function recordGradedSentence(
  user: Pick<UserRow, 'id' | 'name' | 'email' | 'role' | 'capExemptUntil' | 'dailyCapOverride'>
): Promise<DailyUsageSnapshot> {
  const usedToday = await usageRepository.incrementToday(user.id)
  const cap = await getDailyCapFor(user)
  const capped = isCapped(user)
  if (capped && usedToday === cap) void notifyDailyCapReached(user, cap)
  return { usedToday, cap, capped }
}
