import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '../auth/AuthContext'
import { updateUserTimezone } from '../api/userApi'
import { computeStatus, localDay, type StreakSnapshot } from '../../shared/streak'

// What the indicator renders. Derived from the account's streak fields against the browser's own
// local day, then overridden by the fresher snapshot each grade returns.
export interface StreakDisplay {
  enabled: boolean
  current: number
  longest: number
  // Still countable (last active today or yesterday). The indicator hides when not alive.
  alive: boolean
  // The learner has already practiced today.
  activeToday: boolean
}

interface StreakState {
  streak: StreakDisplay
  // Bumped whenever an activity *advanced* the streak (today's first) — drives the pop animation.
  advanceNonce: number
  // Adopt the post-grade snapshot the grade response carries, so the indicator updates (and pops on
  // advance) the moment a sentence or flash card counts, without a refetch.
  applyStreak: (snapshot: StreakSnapshot) => void
}

const browserTimezone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone

const StreakContext = createContext<StreakState | null>(null)

export function StreakProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  // The freshest post-grade snapshot, or null to fall through to the account fields. Reset when the
  // signed-in account changes.
  const [override, setOverride] = useState<StreakSnapshot | null>(null)
  const [advanceNonce, setAdvanceNonce] = useState(0)

  // Capture the browser's timezone once it differs from what's stored, so the server buckets each
  // grade into the right local day. Fire-and-forget; a failure just leaves the previous zone.
  const tzSent = useRef<string | null>(null)
  useEffect(() => {
    if (!user) return
    const tz = browserTimezone()
    if (user.timezone === tz || tzSent.current === tz) return
    tzSent.current = tz
    void updateUserTimezone(tz).catch(() => {})
  }, [user])

  // A different account (or sign-out) invalidates a prior grade's snapshot.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOverride(null)
  }, [user?.id])

  const enabled = user?.streakEnabled !== false
  let streak: StreakDisplay
  if (!enabled || !user) {
    streak = { enabled, current: 0, longest: 0, alive: false, activeToday: false }
  } else if (override) {
    streak = {
      enabled,
      current: override.current,
      longest: override.longest,
      alive: true,
      activeToday: override.activeToday,
    }
  } else {
    const today = localDay(new Date(), browserTimezone())
    const status = computeStatus(user.streakLastDay, user.streakCurrent, today)
    streak = {
      enabled,
      current: status.current,
      longest: user.streakLongest,
      alive: status.alive,
      activeToday: status.activeToday,
    }
  }

  const applyStreak = (snapshot: StreakSnapshot) => {
    setOverride(snapshot)
    if (snapshot.advancedToday) setAdvanceNonce((n) => n + 1)
  }

  return (
    <StreakContext.Provider value={{ streak, advanceNonce, applyStreak }}>
      {children}
    </StreakContext.Provider>
  )
}

export function useStreak() {
  const ctx = useContext(StreakContext)
  if (!ctx) throw new Error('useStreak must be inside StreakProvider')
  return ctx
}
