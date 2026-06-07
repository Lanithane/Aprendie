import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchDecks, type DeckDto } from '../api/flashcardApi'
import type { LanguagePair } from '../../shared/languages'

interface UseFlashcardDecksResult {
  decks: DeckDto[]
  loading: boolean
  error: string | null
}

export function useFlashcardDecks(pair: LanguagePair): UseFlashcardDecksResult {
  const [decks, setDecks] = useState<DeckDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchDecks({
        learn: pair.learnLanguage,
        guess: pair.guessLanguage,
        locale: pair.locale,
      })
      setDecks(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load decks')
    } finally {
      setLoading(false)
    }
  }, [pair.learnLanguage, pair.guessLanguage, pair.locale])

  const depsKey = `${pair.learnLanguage}|${pair.guessLanguage}|${pair.locale}`
  const prevKey = useRef<string | null>(null)
  useEffect(() => {
    if (prevKey.current === depsKey) return
    prevKey.current = depsKey
    void load()
  }, [depsKey, load])

  return { decks, loading, error }
}
