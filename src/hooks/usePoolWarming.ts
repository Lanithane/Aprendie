import { useEffect } from 'react'
import type { LanguageCode, LocaleCode } from '../../shared/languages'
import type { LevelCode } from '../../shared/levels'
import { warmPool } from '../api/sentenceApi'

// Fires a background pool fill whenever the pool key changes (on mount and on selection changes).
// Used by the wizard and settings so the pool is warm by the time the user submits.
export function usePoolWarming(
  learnLanguage: LanguageCode,
  guessLanguage: LanguageCode,
  locale: LocaleCode,
  level: LevelCode | null
) {
  useEffect(() => {
    warmPool({ learnLanguage, guessLanguage, locale, level })
  }, [learnLanguage, guessLanguage, locale, level])
}
