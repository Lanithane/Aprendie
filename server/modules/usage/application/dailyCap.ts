import * as usageRepository from '../persistence/usageRepository'
import { DailyCapExceededError } from '../domain/errors'

// Per-user daily ceiling on graded sentences (corrections) — the operator-key spend
// backstop (Epic 12). Generous for a real learner; only stops runaway/abuse loops.
export const DAILY_GRADED_CAP = 100

// Throws DailyCapExceededError if the user has already hit today's cap.
export async function assertWithinDailyCap(userId: string): Promise<void> {
  const used = await usageRepository.countToday(userId)
  if (used >= DAILY_GRADED_CAP) throw new DailyCapExceededError(DAILY_GRADED_CAP)
}

// Records one graded sentence against today's counter.
export async function recordGradedSentence(userId: string): Promise<void> {
  await usageRepository.incrementToday(userId)
}
