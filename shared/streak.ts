// Streak model shared by the frontend (indicator + seed) and backend (advance at grade time).
// A streak counts consecutive local calendar days on which the learner graded at least one activity
// (a sentence correction or a flash card — both funnel through the same server choke point). The day
// boundary is the user's *local* day, so the local-day math lives here and is reused on both sides.

// The post-grade streak state the server returns in each grade response; the client adopts it the
// moment a sentence or flash card counts, so the indicator updates without a refetch.
export interface StreakSnapshot {
  current: number
  longest: number
  // Whether the streak's most recent active day is today (the learner has practiced today).
  activeToday: boolean
  // Whether *this* activity advanced the streak (today's first counted activity) — drives the
  // subtle pop animation. False when today was already counted.
  advancedToday: boolean
}

// The learner's local calendar day as 'YYYY-MM-DD'. 'en-CA' formats as ISO date parts; an unknown
// timezone (bad/missing pref) falls back to UTC rather than throwing.
export function localDay(date: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(date)
  } catch {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(date)
  }
}

// The calendar day before `day` ('YYYY-MM-DD' → 'YYYY-MM-DD'). Anchored at UTC noon so the
// subtraction never lands on a DST seam.
export function previousDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  const prev = new Date(Date.UTC(y, m - 1, d, 12) - 24 * 60 * 60 * 1000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(prev)
}

// Derive what the indicator should show from the stored streak fields and the client's own local
// "today". A streak is *alive* (still countable) only if its last active day is today or yesterday;
// once a full day lapses it reads as broken (current 0) even though the stored count is untouched
// until the next activity resets it.
export function computeStatus(
  lastDay: string | null,
  storedCurrent: number,
  todayLocal: string
): { current: number; activeToday: boolean; alive: boolean } {
  if (!lastDay) return { current: 0, activeToday: false, alive: false }
  const activeToday = lastDay === todayLocal
  const alive = activeToday || lastDay === previousDay(todayLocal)
  return { current: alive ? storedCurrent : 0, activeToday, alive }
}
