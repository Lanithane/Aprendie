import { useCallback, useEffect, useState } from 'react'
import { fetchSentence, type SentenceDto } from '../api/sentenceApi'
import type { SpanishLocale } from '../../shared/types'
import type { DifficultyPref } from './useDifficultyPreference'

interface UseCurrentSentenceArgs {
  enabled: boolean
  locale: SpanishLocale
  difficulty: DifficultyPref
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
  locale,
  difficulty,
}: UseCurrentSentenceArgs): UseCurrentSentenceResult {
  const [sentence, setSentence] = useState<SentenceDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    try {
      const next = await fetchSentence({ locale, difficulty })
      setSentence(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sentence')
    } finally {
      setLoading(false)
    }
  }, [enabled, locale, difficulty])

  const clear = useCallback(() => setSentence(null), [])

  useEffect(() => {
    if (enabled && !sentence) void reload()
  }, [enabled, sentence, reload])

  return { sentence, loading, error, reload, clear }
}
