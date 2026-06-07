import type { UserRow } from '../../../infrastructure/db/schema'
import * as userRepository from '../persistence/userRepository'
import { advanceStreak } from '../domain/streak'
import { localDay, type StreakSnapshot } from '../../../../shared/streak'

// Advances the learner's streak for one graded activity (a sentence correction or a flash card —
// both call this alongside recordGradedSentence). The activity's local day is derived from the
// account's stored timezone (null → UTC); advanceStreak then no-ops a repeat day, continues a
// consecutive day, or resets after a gap. Opted-out accounts (streakEnabled === false) are frozen:
// no read of the streak and no write. Returns the post-grade snapshot the grade response carries
// back so the client indicator updates without a refetch (null when opted out).
export async function recordStreakActivity(user: UserRow): Promise<StreakSnapshot | null> {
  if (user.streakEnabled === false) return null

  const todayLocal = localDay(new Date(), user.timezone ?? 'UTC')
  const next = advanceStreak(
    { current: user.streakCurrent, longest: user.streakLongest, lastDay: user.streakLastDay },
    todayLocal
  )

  if (next.advanced) {
    await userRepository.updateStreak(user.id, {
      current: next.current,
      longest: next.longest,
      lastDay: todayLocal,
    })
  }

  return {
    current: next.current,
    longest: next.longest,
    activeToday: true,
    advancedToday: next.advanced,
  }
}
