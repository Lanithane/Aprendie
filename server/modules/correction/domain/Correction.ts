import type { LanguageCode, LocaleCode } from '../../../../shared/languages'
import type { LevelCode } from '../../../../shared/levels'

export interface CorrectionMistake {
  userPhrase: string
  correctPhrase: string
  sourceText: string
  explanation: string
}

export interface CorrectionResult {
  isCorrect: boolean
  score: number
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
}
