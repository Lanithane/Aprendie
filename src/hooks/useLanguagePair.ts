import { useCallback, useState } from 'react'
import {
  DEFAULT_PAIR,
  defaultLocaleFor,
  isValidLanguagePair,
  type LanguageCode,
  type LanguagePair,
  type LocaleCode,
} from '../../shared/languages'
import { useAuth } from '../auth/AuthContext'
import { updateUserLanguagePair } from '../api/userApi'

// The language pair is owned by the account (server truth, Epic 11). We keep a
// localStorage cache so a cold load paints the last-known pair instantly, before
// `/api/me` resolves; the server value wins once it arrives.
const STORAGE_KEY = 'gac:languagePair'

function readCache(): LanguagePair | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<LanguagePair>
    if (
      typeof p.learnLanguage === 'string' &&
      typeof p.guessLanguage === 'string' &&
      typeof p.locale === 'string' &&
      isValidLanguagePair(p.learnLanguage, p.guessLanguage, p.locale)
    ) {
      return { learnLanguage: p.learnLanguage, guessLanguage: p.guessLanguage, locale: p.locale }
    }
  } catch {
    // ignore
  }
  return null
}

function writeCache(pair: LanguagePair) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pair))
  } catch {
    // ignore
  }
}

export function useLanguagePair() {
  const { user, refresh } = useAuth()
  // Optimistic override held only while a server write is in flight (mirrors
  // useLevelPreference): undefined = no pending change, fall through to server/cache.
  const [override, setOverride] = useState<LanguagePair | undefined>(undefined)

  let serverPair: LanguagePair | null = null
  if (user && isValidLanguagePair(user.learnLanguage, user.guessLanguage, user.locale)) {
    serverPair = {
      learnLanguage: user.learnLanguage as LanguageCode,
      guessLanguage: user.guessLanguage as LanguageCode,
      locale: user.locale as LocaleCode,
    }
  }

  const pair = override ?? serverPair ?? readCache() ?? DEFAULT_PAIR

  const commit = useCallback(
    (next: LanguagePair) => {
      writeCache(next)
      setOverride(next)
      void (async () => {
        try {
          await updateUserLanguagePair(next)
          await refresh()
        } finally {
          setOverride(undefined)
        }
      })()
    },
    [refresh]
  )

  // Changing the learn language resets the locale to that language's default and
  // swaps the guess language if it would otherwise collide.
  const setLearnLanguage = useCallback(
    (learn: LanguageCode) => {
      const guessLanguage = pair.guessLanguage === learn ? pair.learnLanguage : pair.guessLanguage
      commit({ learnLanguage: learn, guessLanguage, locale: defaultLocaleFor(learn) })
    },
    [pair, commit]
  )

  const setGuessLanguage = useCallback(
    (guess: LanguageCode) => {
      if (guess === pair.learnLanguage) return
      commit({ ...pair, guessLanguage: guess })
    },
    [pair, commit]
  )

  const setLocale = useCallback(
    (locale: LocaleCode) => {
      commit({ ...pair, locale })
    },
    [pair, commit]
  )

  return { pair, commit, setLearnLanguage, setGuessLanguage, setLocale }
}
