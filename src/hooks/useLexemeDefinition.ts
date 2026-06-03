import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchLexemeDefinition } from '../api/palabradexApi'
import { ApiError } from '../api/client'
import type { LanguageCode } from '../../shared/languages'

interface UseLexemeDefinitionResult {
  definition: string | null
  loading: boolean
  error: string | null
}

// Lazy-loads a root's translated definition when a row is drilled into. `lemma` is undefined
// while the row is collapsed; the fetch only fires once a lemma is provided. The server caches
// definitions across users, so repeats are cheap.
export function useLexemeDefinition(
  learnLanguage: LanguageCode | undefined,
  guessLanguage: LanguageCode | undefined,
  lemma: string | undefined
): UseLexemeDefinitionResult {
  const [definition, setDefinition] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (
      learn: LanguageCode | undefined,
      guess: LanguageCode | undefined,
      lem: string | undefined
    ) => {
      if (!learn || !guess || !lem) {
        setDefinition(null)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const res = await fetchLexemeDefinition(learn, guess, lem)
        setDefinition(res.definition)
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load definition')
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const depsKey = `${learnLanguage ?? ''}|${guessLanguage ?? ''}|${lemma ?? ''}`
  const prevKey = useRef<string | null>(null)
  useEffect(() => {
    if (prevKey.current === depsKey) return
    prevKey.current = depsKey
    void load(learnLanguage, guessLanguage, lemma)
  }, [depsKey, learnLanguage, guessLanguage, lemma, load])

  return { definition, loading, error }
}
