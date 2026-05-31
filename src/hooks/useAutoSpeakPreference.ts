import { useCallback, useState } from 'react'
import {
  AUTO_SPEAK_DEFAULT,
  AUTO_SPEAK_DELAY_DEFAULT_MS,
  clampAutoSpeakDelay,
} from '../../shared/speech'
import { useAuth } from '../auth/AuthContext'
import { updateUserAutoSpeak } from '../api/userApi'

// Auto-speak preferences: whether a freshly loaded sentence is read aloud on its own (on by
// default — the manual speaker button always works) and how long to wait before it plays so the
// learner can glance at the sentence first. Both are owned by the account (server truth), persisted
// via PATCH /api/me/auto-speak, and mirror useLevelPreference's optimistic-override pattern: a
// pending local value shows immediately, then the refreshed server value takes over. A null/unset
// server value falls back to the shared defaults, so a new account gets auto-speak on at 500 ms.
export function useAutoSpeakPreference() {
  const { user, refresh } = useAuth()
  // Optimistic overrides held only while a server write is in flight (undefined = no pending
  // change, fall through to the server value). The toggle and delay are written independently.
  const [enabledOverride, setEnabledOverride] = useState<boolean | undefined>(undefined)
  const [delayOverride, setDelayOverride] = useState<number | undefined>(undefined)

  const autoSpeak = enabledOverride ?? user?.autoSpeak ?? AUTO_SPEAK_DEFAULT
  const delayMs = clampAutoSpeakDelay(
    delayOverride ?? user?.autoSpeakDelayMs ?? AUTO_SPEAK_DELAY_DEFAULT_MS
  )

  const setAutoSpeak = useCallback(
    (next: boolean) => {
      setEnabledOverride(next)
      void (async () => {
        try {
          await updateUserAutoSpeak({ autoSpeak: next })
          await refresh()
        } finally {
          setEnabledOverride(undefined)
        }
      })()
    },
    [refresh]
  )

  const setDelayMs = useCallback(
    (next: number) => {
      const clamped = clampAutoSpeakDelay(next)
      setDelayOverride(clamped)
      void (async () => {
        try {
          await updateUserAutoSpeak({ autoSpeakDelayMs: clamped })
          await refresh()
        } finally {
          setDelayOverride(undefined)
        }
      })()
    },
    [refresh]
  )

  return { autoSpeak, setAutoSpeak, delayMs, setDelayMs }
}
