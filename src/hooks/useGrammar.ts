import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchGrammar, type GrammarReference } from '../api/grammarApi'
import { ApiError } from '../api/client'
import type { LanguagePair } from '../../shared/languages'

interface UseGrammarResult {
  reference: GrammarReference | null
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

// Loads the language grammar reference for the active pair, refetching whenever the pair changes —
// so the Palabradex "Language" mode always matches the learn language selected in Settings (or via
// the language tabs). The fetch lives behind this hook per the useEffect rules; the component only
// mounts it in "Language" mode, so generation/lookup only runs when that mode is on. The server
// caches per (learn, guess, locale), so a pair the learner has visited before resolves instantly.
export function useGrammar(pair: LanguagePair): UseGrammarResult {
  const [reference, setReference] = useState<GrammarReference | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { learnLanguage, guessLanguage, locale } = pair

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setReference(await fetchGrammar(learnLanguage, guessLanguage, locale))
    } catch (err) {
      setReference(null)
      setError(err instanceof ApiError ? err.message : 'Failed to load the grammar reference')
    } finally {
      setLoading(false)
    }
  }, [learnLanguage, guessLanguage, locale])

  const depsKey = `${learnLanguage}|${guessLanguage}|${locale}`
  const prevKey = useRef<string | null>(null)
  useEffect(() => {
    if (prevKey.current === depsKey) return
    prevKey.current = depsKey
    void reload()
  }, [depsKey, reload])

  return { reference, loading, error, reload }
}
