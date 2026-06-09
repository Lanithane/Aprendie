import { useEffect } from 'react'
import i18next from 'i18next'
import { useLanguagePair } from './useLanguagePair'

// Keeps the active UI language locked to the account's *known* language (the pair's guess
// language). `useLanguagePair` resolves it from the optimistic override → server → cache → browser
// default, so this fires immediately when the learner changes their known language in Settings and
// again once `/api/me` confirms it. Also mirrors it onto `<html lang>` for a11y / the browser.
export function useUiLanguageSync() {
  const { pair } = useLanguagePair()
  const known = pair.guessLanguage

  useEffect(() => {
    if (i18next.language !== known) void i18next.changeLanguage(known)
    document.documentElement.lang = known
  }, [known])
}
