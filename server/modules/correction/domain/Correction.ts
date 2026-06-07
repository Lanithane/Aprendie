import type { LanguageCode, LocaleCode, WordToken } from '../../../../shared/languages'
import type { LevelCode } from '../../../../shared/levels'
import type { DailyUsageSnapshot } from '../../usage/domain/DailyUsage'

export interface CorrectionMistake {
  userPhrase: string
  correctPhrase: string
  sourceText: string
  explanation: string
}

export type Naturalness = 'natural' | 'stiff'

export interface CorrectionResult {
  isCorrect: boolean
  score: number
  grade: string
  naturalness: Naturalness
  correctedAnswer: string
  mistakes: CorrectionMistake[]
  notes?: string
}

export interface CorrectionView extends CorrectionResult {
  sentenceId: string
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
  level: LevelCode | null
  promptText: string
  answerText: string
  userAnswer: string
  wordBreakdown: WordToken[]
  // The learner's daily-cap posture after this grade counted, so the practice UI can update its
  // near-cap banner without a refetch.
  dailyUsage: DailyUsageSnapshot
}
