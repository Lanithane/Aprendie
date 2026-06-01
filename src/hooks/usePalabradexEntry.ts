import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchRootDetail, type RootDetailDto } from '../api/palabradexApi'
import { ApiError } from '../api/client'
import type { LanguageCode } from '../../shared/languages'

interface UsePalabradexEntryResult {
  detail: RootDetailDto | null
  loading: boolean
  error: string | null
}

// Lazy-loads one root's detail (its variants) when a row is drilled into. `lemma` is undefined
// while the row is collapsed; the fetch only fires once a lemma is provided.
export function usePalabradexEntry(
  learnLanguage: LanguageCode | undefined,
  lemma: string | undefined
): UsePalabradexEntryResult {
  const [detail, setDetail] = useState<RootDetailDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (lang: LanguageCode | undefined, lem: string | undefined) => {
    if (!lang || !lem) {
      setDetail(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setDetail(await fetchRootDetail(lang, lem))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load variants')
    } finally {
      setLoading(false)
    }
  }, [])

  const depsKey = `${learnLanguage ?? ''}|${lemma ?? ''}`
  const prevKey = useRef<string | null>(null)
  useEffect(() => {
    if (prevKey.current === depsKey) return
    prevKey.current = depsKey
    void load(learnLanguage, lemma)
  }, [depsKey, learnLanguage, lemma, load])

  return { detail, loading, error }
}
