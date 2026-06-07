import { useCallback, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { updateUserStreakEnabled } from '../api/userApi'

// The streak opt-out toggle, owned by the account (server truth) and persisted via PATCH
// /api/me/streak. Mirrors useAutoSpeakPreference's optimistic-override pattern: a pending local value
// shows immediately, then the refreshed server value takes over. A null/unset column defaults to on
// (streaks are opt-out), so a new account participates until they turn it off.
export function useStreakPreference() {
  const { user, refresh } = useAuth()
  const [override, setOverride] = useState<boolean | undefined>(undefined)

  const enabled = override ?? user?.streakEnabled ?? true

  const setEnabled = useCallback(
    (next: boolean) => {
      setOverride(next)
      void (async () => {
        try {
          await updateUserStreakEnabled(next)
          await refresh()
        } finally {
          setOverride(undefined)
        }
      })()
    },
    [refresh]
  )

  return { enabled, setEnabled }
}
