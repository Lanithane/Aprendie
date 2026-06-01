import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchShowback, type Showback } from '../api/showbackApi'

// Loads the signed-in account's cumulative usage showback. Non-critical: a failure leaves
// `showback` null and the UI simply hides the contribute section. Refetches when the user
// changes (sign-in / account switch).
export function useShowback(userId: string | undefined): {
  showback: Showback | null
  loading: boolean
} {
  const [showback, setShowback] = useState<Showback | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (uid: string | undefined) => {
    if (!uid) {
      setShowback(null)
      return
    }
    setLoading(true)
    try {
      setShowback(await fetchShowback())
    } catch {
      setShowback(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const prevId = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (prevId.current === userId) return
    prevId.current = userId
    void load(userId)
  }, [userId, load])

  return { showback, loading }
}
