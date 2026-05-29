import { useCallback, useState } from 'react'
import type { LevelCode } from '../../shared/levels'
import { useAuth } from '../auth/AuthContext'
import { updateUserLevel } from '../api/userApi'

export type LevelPref = LevelCode | null

export function useLevelPreference() {
  const { user, refresh } = useAuth()
  // Optimistic override: undefined = no pending change, use server value
  const [override, setOverride] = useState<LevelPref | undefined>(undefined)

  const pref: LevelPref = override !== undefined ? override : (user?.level ?? null)

  const setPref = useCallback(
    (next: LevelPref) => {
      setOverride(next)
      void (async () => {
        try {
          await updateUserLevel(next)
          await refresh()
        } finally {
          setOverride(undefined)
        }
      })()
    },
    [refresh]
  )

  return { pref, setPref }
}
