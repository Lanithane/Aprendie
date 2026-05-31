import { useCallback, useState } from 'react'
import type { LanguagePair } from '../../shared/languages'
import type { LevelCode } from '../../shared/levels'
import { useAuth } from '../auth/AuthContext'
import { updateUserLanguagePair, updateUserLevel } from '../api/userApi'
import { prewarmPool } from '../api/sentenceApi'
import { writeLanguagePairCache } from './useLanguagePair'

// Drives the first-run gate (Epic 11). A brand-new account lands here once approved but before it
// has chosen a language pair; completing the wizard persists the pair + level, warms the chosen
// pool, then refreshes so the gate flips and practice is already warm.
export function useOnboarding() {
  const { user, isApproved, refresh } = useAuth()
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // First run = an approved account that hasn't chosen its language pair yet (the server columns
  // are null). The pair is the single signal: `level` may legitimately stay null ("Any"), and the
  // pair is always written as a complete triple, so any null means onboarding hasn't been done.
  const needsOnboarding =
    isApproved && !!user && (!user.learnLanguage || !user.guessLanguage || !user.locale)

  // Returns void (fire-and-forget) so it drops straight into the wizard's onComplete handler; all
  // outcomes are reflected through `completing` / `error`.
  const complete = useCallback(
    (pair: LanguagePair, level: LevelCode | null) => {
      setCompleting(true)
      setError(null)
      void (async () => {
        // Warm the chosen pool FIRST (a small inline batch) so practice is never cold — the server
        // tops it up to a full pool in the background. Best-effort: if it fails, the first
        // /api/sentence just generates inline. Done before persisting the pair so the gate doesn't
        // flip to a cold practice screen mid-warm.
        try {
          await prewarmPool({ ...pair, level })
        } catch {
          // non-fatal — practice will inline-generate if the pool didn't warm
        }
        try {
          writeLanguagePairCache(pair)
          await Promise.all([updateUserLanguagePair(pair), updateUserLevel(level)])
          // Refresh flips `needsOnboarding` false and unmounts the wizard; practice then reads the
          // now-warm pool. Deliberately leave `completing` true on success so the wizard shows
          // "preparing" right up to the unmount instead of flashing back to the form.
          await refresh()
        } catch {
          setError('We couldn’t save your choices. Please try again.')
          setCompleting(false)
        }
      })()
    },
    [refresh]
  )

  return { needsOnboarding, completing, error, complete }
}
