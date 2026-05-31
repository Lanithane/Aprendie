import { useCallback, useState } from 'react'
import type { LanguagePair } from '../../shared/languages'
import type { LevelCode } from '../../shared/levels'
import { useAuth } from '../auth/AuthContext'
import { updateUserLanguagePair, updateUserLevel } from '../api/userApi'
import { writeLanguagePairCache } from './useLanguagePair'

export function useOnboarding() {
  const { user, isApproved, refresh } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const needsOnboarding =
    isApproved && !!user && (!user.learnLanguage || !user.guessLanguage || !user.locale)

  const complete = useCallback(
    (pair: LanguagePair, level: LevelCode | null) => {
      setError(null)
      void (async () => {
        try {
          writeLanguagePairCache(pair)
          // Saving the pair triggers a background batch on the server, so practice lands warm.
          await Promise.all([updateUserLanguagePair(pair), updateUserLevel(level)])
          await refresh()
        } catch {
          setError("We couldn't save your choices. Please try again.")
        }
      })()
    },
    [refresh]
  )

  return { needsOnboarding, error, complete }
}
