import type { UserRow } from '../../../infrastructure/db/schema'
import * as usageRepository from '../persistence/usageRepository'
import { getDailyCapFor } from '../../settings/application/appSettings'
import { DailyCapExceededError } from '../domain/errors'

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

// Records one graded sentence against today's counter.
export async function recordGradedSentence(userId: string): Promise<void> {
  await usageRepository.incrementToday(userId)
}
