import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchUserHistory } from '../api/adminApi'
import { ApiError } from '../api/client'
import type { AttemptDto } from '../api/historyApi'

interface UseUserHistoryResult {
  items: AttemptDto[]
  loading: boolean
  loadingMore: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => Promise<void>
}

// Admin view of one user's attempt history (all language pairs). Same cursor
// shape as useHistory, keyed by the target user's id.
export function useUserHistory(userId: string | null): UseUserHistoryResult {
  const [items, setItems] = useState<AttemptDto[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!userId) {
      setItems([])
      setCursor(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const page = await fetchUserHistory(userId)
      setItems(page.items)
      setCursor(page.nextCursor)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }, [userId])

  const loadMore = useCallback(async () => {
    if (!userId || !cursor) return
    setLoadingMore(true)
    setError(null)
    try {
      const page = await fetchUserHistory(userId, cursor)
      setItems((cur) => [...cur, ...page.items])
      setCursor(page.nextCursor)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load more history')
    } finally {
      setLoadingMore(false)
    }
  }, [userId, cursor])

  // Load the first page whenever the targeted user changes (null = collapsed).
  const prevId = useRef<string | null>(null)
  useEffect(() => {
    if (prevId.current === userId) return
    prevId.current = userId
    // reload() owns its own loading state; this is a deliberate data fetch.
    void reload()
  }, [userId, reload])

  return { items, loading, loadingMore, error, hasMore: cursor !== null, loadMore }
}
