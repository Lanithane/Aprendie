import { useCallback, useState } from 'react'
import { resolveLocale } from '../api/languageApi'
import type { LanguageCode, LocaleCode } from '../../shared/languages'

interface UseLocaleResolverResult {
  resolve: (learnLanguage: LanguageCode, location: string) => Promise<LocaleCode | null>
  resolving: boolean
  error: string | null
}

export function useLocaleResolver(): UseLocaleResolverResult {
  const [resolving, setResolving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resolve = useCallback(async (learnLanguage: LanguageCode, location: string) => {
    setResolving(true)
    setError(null)
    try {
      const { locale } = await resolveLocale(learnLanguage, location)
      return locale
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to detect locale')
      return null
    } finally {
      setResolving(false)
    }
  }, [])

  return { resolve, resolving, error }
}
