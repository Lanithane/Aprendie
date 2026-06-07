import { previousDay } from '../../../../shared/streak'

// Pure streak advance, applied once per graded activity. Given the stored state and the activity's
// local day, decide the new running count: a repeat on the same day is a no-op, an activity the day
// after the last one continues the run, and any larger gap (or a first-ever activity) starts a fresh
// run at 1. `longest` only ratchets up. `advanced` flags today's first counted activity (drives the
// indicator's pop animation).
export interface StreakState {
  current: number
  longest: number
  lastDay: string | null
}

export function advanceStreak(
  prev: StreakState,
  todayLocal: string
): StreakState & { advanced: boolean } {
  if (prev.lastDay === todayLocal) {
    return { ...prev, advanced: false }
  }
  const current = prev.lastDay === previousDay(todayLocal) ? prev.current + 1 : 1
  return {
    current,
    longest: Math.max(prev.longest, current),
    lastDay: todayLocal,
    advanced: true,
  }
}
