import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_PAIR,
  defaultLocaleFor,
  isSupportedLanguage,
  isValidLocaleFor,
  type LanguageCode,
  type LanguagePair,
  type LocaleCode,
} from '../../shared/languages'

const STORAGE_KEY = 'gac:languagePair'

function read(): LanguagePair {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Partial<LanguagePair>
      if (
        typeof p.learnLanguage === 'string' &&
        isSupportedLanguage(p.learnLanguage) &&
        typeof p.guessLanguage === 'string' &&
        isSupportedLanguage(p.guessLanguage) &&
        p.learnLanguage !== p.guessLanguage &&
        typeof p.locale === 'string' &&
        isValidLocaleFor(p.learnLanguage, p.locale)
      ) {
        return { learnLanguage: p.learnLanguage, guessLanguage: p.guessLanguage, locale: p.locale }
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_PAIR
}

function write(pair: LanguagePair) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pair))
  } catch {
    // ignore
  }
}

export function useLanguagePair() {
  const [pair, setPairState] = useState<LanguagePair>(read())

  const commit = useCallback((next: LanguagePair) => {
    write(next)
    setPairState(next)
  }, [])

  // Changing the learn language resets the locale to that language's default and
  // swaps the guess language if it would otherwise collide.
  const setLearnLanguage = useCallback((learn: LanguageCode) => {
    setPairState((prev) => {
      const guessLanguage = prev.guessLanguage === learn ? prev.learnLanguage : prev.guessLanguage
      const next: LanguagePair = {
        learnLanguage: learn,
        guessLanguage,
        locale: defaultLocaleFor(learn),
      }
      write(next)
      return next
    })
  }, [])

  const setGuessLanguage = useCallback((guess: LanguageCode) => {
    setPairState((prev) => {
      if (guess === prev.learnLanguage) return prev
      const next: LanguagePair = { ...prev, guessLanguage: guess }
      write(next)
      return next
    })
  }, [])

  const setLocale = useCallback((locale: LocaleCode) => {
    setPairState((prev) => {
      const next: LanguagePair = { ...prev, locale }
      write(next)
      return next
    })
  }, [])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setPairState(read())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return { pair, commit, setLearnLanguage, setGuessLanguage, setLocale }
}
