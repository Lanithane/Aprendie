import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchSentence, type SentenceDto } from '../api/sentenceApi'
import type { LanguagePair } from '../../shared/languages'
import type { LevelPref } from './useLevelPreference'

interface UseCurrentSentenceArgs {
  enabled: boolean
  pair: LanguagePair
  level: LevelPref
}

interface UseCurrentSentenceResult {
  sentence: SentenceDto | null
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  clear: () => void
}

export function useCurrentSentence({
  enabled,
  pair,
  level,
}: UseCurrentSentenceArgs): UseCurrentSentenceResult {
  const [sentence, setSentence] = useState<SentenceDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { learnLanguage, guessLanguage, locale } = pair

  const reload = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      const next = await fetchSentence({ learnLanguage, guessLanguage, locale, level })
      setSentence(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sentence')
    } finally {
      setLoading(false)
    }
  }, [enabled, learnLanguage, guessLanguage, locale, level])

  const clear = useCallback(() => setSentence(null), [])

  // Load on mount and whenever the sentence is cleared (e.g. pressing "Next").
  useEffect(() => {
    if (enabled && !sentence) void reload()
  }, [enabled, sentence, reload])

  // Drop the current sentence when the language pair / level changes so a fresh
  // one is fetched for the new selection.
  const depsKey = `${learnLanguage}|${guessLanguage}|${locale}|${level ?? ''}`
  const prevKey = useRef(depsKey)
  useEffect(() => {
    if (prevKey.current !== depsKey) {
      prevKey.current = depsKey
      setSentence(null)
    }
  }, [depsKey])

  return { sentence, loading, error, reload, clear }
}
