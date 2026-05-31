import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchHistory, type AttemptDto } from '../api/historyApi'
import { ApiError } from '../api/client'
import type { LanguagePair } from '../../shared/languages'
import type { LevelCode } from '../../shared/levels'

export interface HistoryOptions {
  level?: LevelCode | null
  sort?: 'newest' | 'worst'
}

interface UseHistoryResult {
  items: AttemptDto[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => Promise<void>
  reload: () => Promise<void>
}

export function useHistory(
  userId: string | undefined,
  pair: LanguagePair,
  options?: HistoryOptions
): UseHistoryResult {
  const [items, setItems] = useState<AttemptDto[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)

  const level = options?.level ?? null
  const sort = options?.sort ?? 'newest'

  const reload = useCallback(async () => {
    if (!userId) {
      setItems([])
      setCursor(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const page = await fetchHistory(pair, { level: level ?? undefined, sort })
      setItems(page.items)
      setCursor(page.nextCursor)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }, [userId, pair, level, sort])

  const loadMore = useCallback(async () => {
    if (!userId || !cursor) return
    setLoadingMore(true)
    setError(null)
    try {
      const page = await fetchHistory(pair, { cursor, level: level ?? undefined, sort })
      setItems((cur) => [...cur, ...page.items])
      setCursor(page.nextCursor)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load more history')
    } finally {
      setLoadingMore(false)
    }
  }, [userId, pair, cursor, level, sort])

  // Refetch on mount and whenever the user, language pair, level, or sort changes.
  const depsKey = `${userId ?? ''}|${pair.learnLanguage}|${pair.guessLanguage}|${pair.locale}|${level ?? ''}|${sort}`
  const prevKey = useRef<string | null>(null)
  useEffect(() => {
    if (prevKey.current === depsKey) return
    prevKey.current = depsKey
    // reload() owns its own loading state; this is a deliberate data fetch.
    void reload()
  }, [depsKey, reload])

  return { items, loading, loadingMore, error, hasMore: cursor !== null, loadMore, reload }
}
