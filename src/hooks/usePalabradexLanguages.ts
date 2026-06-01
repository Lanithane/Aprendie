import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchPalabradexLanguages } from '../api/palabradexApi'
import type { LanguageCode } from '../../shared/languages'

// The distinct learn languages this user has any recorded words for — drives the Palabradex
// language selector. Non-critical: the page handles an empty list gracefully.
export function usePalabradexLanguages(userId: string | undefined): {
  languages: LanguageCode[]
  loading: boolean
} {
  const [languages, setLanguages] = useState<LanguageCode[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (uid: string | undefined) => {
    if (!uid) {
      setLanguages([])
      return
    }
    setLoading(true)
    try {
      setLanguages(await fetchPalabradexLanguages())
    } catch {
      // ignore — empty list renders the "no words yet" state
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

  return { languages, loading }
}
