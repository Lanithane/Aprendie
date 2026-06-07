import { useCallback, useState } from 'react'
import {
  fetchNextCard,
  gradeCard,
  type FlashcardDto,
  type FlashcardGradeDto,
} from '../api/flashcardApi'
import type { LanguagePair } from '../../shared/languages'
import { useDailyUsage } from '../usage/DailyUsageContext'

type SessionState =
  | { phase: 'loading' }
  | { phase: 'question'; card: FlashcardDto }
  | { phase: 'grading'; card: FlashcardDto }
  | { phase: 'result'; card: FlashcardDto; grade: FlashcardGradeDto }
  | { phase: 'error'; message: string }

interface UseFlashcardSessionResult {
  state: SessionState
  loadNext: (deckId: string) => void
  submit: (answer: string) => void
}

export function useFlashcardSession(pair: LanguagePair): UseFlashcardSessionResult {
  const [state, setState] = useState<SessionState>({ phase: 'loading' })
  const { applySnapshot } = useDailyUsage()

  const loadNext = useCallback(
    (deckId: string) => {
      setState({ phase: 'loading' })
      fetchNextCard({
        learn: pair.learnLanguage,
        guess: pair.guessLanguage,
        locale: pair.locale,
        deck: deckId,
      })
        .then((card) => setState({ phase: 'question', card }))
        .catch((err: Error) => setState({ phase: 'error', message: err.message }))
    },
    [pair.learnLanguage, pair.guessLanguage, pair.locale]
  )

  const submit = useCallback(
    (answer: string) => {
      if (state.phase !== 'question') return
      const { card } = state
      setState({ phase: 'grading', card })
      gradeCard(card.id, answer)
        .then((grade) => {
          setState({ phase: 'result', card, grade })
          // This grade counted against the daily cap (shared with sentences) — refresh the banner.
          applySnapshot(grade.dailyUsage)
        })
        .catch((err: Error) => setState({ phase: 'error', message: err.message }))
    },
    [state, applySnapshot]
  )

  return { state, loadNext, submit }
}
