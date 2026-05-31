import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchPokedex, type LexemeSort, type LexemeStatsDto } from '../api/pokedexApi'
import { ApiError } from '../api/client'
import type { LanguageCode } from '../../shared/languages'

interface UsePokedexResult {
  entries: LexemeStatsDto[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

// Loads the per-user root list for one learn language + sort. Refetches whenever the user,
// language, or sort changes (the lone, deliberate data fetch lives behind this hook per the
// useEffect rules).
export function usePokedex(
  userId: string | undefined,
  learnLanguage: LanguageCode | undefined,
  sort: LexemeSort
): UsePokedexResult {
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
      setEntries(await fetchPokedex(learnLanguage, sort))
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
