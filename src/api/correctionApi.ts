import { api } from './client'
import type { LanguageCode, LocaleCode } from '../../shared/languages'
import type { LevelCode } from '../../shared/levels'

export interface CorrectionMistakeDto {
  userPhrase: string
  correctPhrase: string
  sourceText: string
  explanation: string
}

export interface CorrectionDto {
  sentenceId: string
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
  level: LevelCode | null
  promptText: string
  answerText: string
  userAnswer: string
  isCorrect: boolean
  score: number
  grade: string
  naturalness: 'natural' | 'stiff'
  correctedAnswer: string
  mistakes: CorrectionMistakeDto[]
  notes?: string
}

export function submitCorrection(sentenceId: string, userAnswer: string): Promise<CorrectionDto> {
  return api<CorrectionDto>('/api/correct', {
    method: 'POST',
    body: JSON.stringify({ sentenceId, userAnswer }),
  })
}
