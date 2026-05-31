import { api } from './client'
import type { LanguageCode, LanguagePair, LocaleCode, WordToken } from '../../shared/languages'
import type { LevelCode } from '../../shared/levels'

export interface AttemptMistakeDto {
  userPhrase: string
  correctPhrase: string
  sourceText: string
  explanation: string
}

export interface AttemptDto {
  id: string
  sentenceId: string | null
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
  level: LevelCode | null
  promptText: string
  answerText: string
  userAnswer: string
  correctedAnswer: string
  score: number
  grade: string
  isCorrect: boolean
  mistakes: AttemptMistakeDto[]
  notes?: string
  wordBreakdown: WordToken[]
  createdAt: string
}

export interface HistoryPageDto {
  items: AttemptDto[]
  nextCursor: string | null
}

export function fetchHistory(pair: LanguagePair, cursor?: string): Promise<HistoryPageDto> {
  const search = new URLSearchParams({
    learnLanguage: pair.learnLanguage,
    guessLanguage: pair.guessLanguage,
    locale: pair.locale,
  })
  if (cursor) search.set('cursor', cursor)
  return api<HistoryPageDto>(`/api/history?${search.toString()}`)
}

export function fetchHistoryEntry(id: string): Promise<AttemptDto> {
  return api<AttemptDto>(`/api/history/${id}`)
}
