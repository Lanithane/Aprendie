import { useCallback, useState } from 'react'
import type { LanguagePair } from '../../shared/languages'
import type { LevelCode } from '../../shared/levels'
import { useAuth } from '../auth/AuthContext'
import { updateUserLanguagePair, updateUserLevel } from '../api/userApi'
import { warmFirstSentences } from '../api/sentenceApi'
import { writeLanguagePairCache } from './useLanguagePair'

export function useOnboarding() {
  const { user, isApproved, refresh } = useAuth()
  const [error, setError] = useState<string | null>(null)
  // True while completing: saving choices then warming the first sentence. Drives the wizard's
  // "Preparing your first few sentences…" screen. Stays true through the unmount on success (the
  // practice page takes over); only reset on error so the form comes back.
  const [preparing, setPreparing] = useState(false)

  const needsOnboarding =
    isApproved && !!user && (!user.learnLanguage || !user.guessLanguage || !user.locale)

  const complete = useCallback(
    (pair: LanguagePair, level: LevelCode | null) => {
      setError(null)
      setPreparing(true)
      void (async () => {
        try {
          writeLanguagePairCache(pair)
          await Promise.all([updateUserLanguagePair(pair), updateUserLevel(level)])
          // Warm the chosen slice synchronously so the first practice sentence is ready, instead of
          // cold-starting (and showing a bare spinner) on the practice page. Best-effort: if warming
          // fails (rate limit, spend paused), practice falls back to its own cold-start.
          await warmFirstSentences({ ...pair, level }).catch(() => {})
          await refresh()
        } catch {
          setError("We couldn't save your choices. Please try again.")
          setPreparing(false)
        }
      })()
    },
    [refresh]
  )

  return { needsOnboarding, error, preparing, complete }
}
