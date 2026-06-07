import { api } from './client'
import type { LanguageCode, LocaleCode } from '../../shared/languages'
import type { DailyUsageDto } from './usageApi'
import type { StreakSnapshot } from '../../shared/streak'

export interface FlashcardDto {
  id: string
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
  deckId: string
  lemma: string
  gloss: string
  partOfSpeech: string
  gender?: 'masculine' | 'feminine' | 'neuter'
}

export interface FlashcardGradeDto {
  flashcardId: string
  isCorrect: boolean
  score: number
  acceptedGloss: string
  note?: string
  lemma: string
  gloss: string
  example: string
  exampleTranslation: string
  dailyUsage: DailyUsageDto
  streak: StreakSnapshot | null
}

export interface DeckProgressDto {
  seen: number
  total: number
  struggling: number
}

export interface DeckDto {
  id: string
  label: string
  kind: 'function' | 'noun'
  spec: string
  size: number
  examples: [string, string, string]
  progress: DeckProgressDto
}

export function fetchDecks(params: {
  learn: string
  guess: string
  locale: string
}): Promise<DeckDto[]> {
  const q = new URLSearchParams(params).toString()
  return api<DeckDto[]>(`/api/flashcards/decks?${q}`)
}

export function fetchNextCard(params: {
  learn: string
  guess: string
  locale: string
  deck: string
}): Promise<FlashcardDto> {
  const q = new URLSearchParams(params).toString()
  return api<FlashcardDto>(`/api/flashcards/next?${q}`)
}

export function gradeCard(flashcardId: string, answer: string): Promise<FlashcardGradeDto> {
  return api<FlashcardGradeDto>('/api/flashcards/grade', {
    method: 'POST',
    body: JSON.stringify({ flashcardId, answer }),
  })
}
