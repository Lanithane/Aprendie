import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchHistoryLanguages } from '../api/historyApi'
import type { LanguagePair } from '../../shared/languages'

export function useHistoryLanguages(userId: string | undefined): {
  pairs: LanguagePair[]
  loading: boolean
} {
  const [pairs, setPairs] = useState<LanguagePair[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (uid: string | undefined) => {
    if (!uid) {
      setPairs([])
      return
    }
    setLoading(true)
    try {
      setPairs(await fetchHistoryLanguages())
    } catch {
      // Non-critical: history page gracefully handles empty pairs.
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

  return { pairs, loading }
}
