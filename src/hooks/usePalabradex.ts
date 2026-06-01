import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchPalabradex, type LexemeSort, type LexemeStatsDto } from '../api/palabradexApi'
import { ApiError } from '../api/client'
import type { LanguageCode } from '../../shared/languages'

interface UsePalabradexResult {
  entries: LexemeStatsDto[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

// Loads the per-user root list for one learn language + sort. Refetches whenever the user,
// language, or sort changes (the lone, deliberate data fetch lives behind this hook per the
// useEffect rules).
export function usePalabradex(
  userId: string | undefined,
  learnLanguage: LanguageCode | undefined,
  sort: LexemeSort
): UsePalabradexResult {
  const [entries, setEntries] = useState<LexemeStatsDto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!userId || !learnLanguage) {
      setEntries([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      setEntries(await fetchPalabradex(learnLanguage, sort))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load your word collection')
    } finally {
      setLoading(false)
    }
  }, [userId, learnLanguage, sort])

  const depsKey = `${userId ?? ''}|${learnLanguage ?? ''}|${sort}`
  const prevKey = useRef<string | null>(null)
  useEffect(() => {
    if (prevKey.current === depsKey) return
    prevKey.current = depsKey
    void reload()
  }, [depsKey, reload])

  return { entries, loading, error, reload }
}
