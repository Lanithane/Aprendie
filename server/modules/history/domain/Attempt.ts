import type { LanguageCode, LocaleCode, WordToken } from '../../../../shared/languages'
import type { LevelCode } from '../../../../shared/levels'
import type { AttemptRow } from '../../../infrastructure/db/schema'

// Mirrors the correction `Mistake` shape; kept local so the domain layer stays
// free of cross-module imports.
export interface AttemptMistake {
  userPhrase: string
  correctPhrase: string
  sourceText: string
  explanation: string
}

export interface AttemptView {
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
  isCorrect: boolean
  mistakes: AttemptMistake[]
  notes?: string
  wordBreakdown: WordToken[]
  createdAt: string
}

export function toAttemptView(row: AttemptRow): AttemptView {
  return {
    id: row.id,
    sentenceId: row.sentenceId,
    learnLanguage: row.learnLanguage as LanguageCode,
    guessLanguage: row.guessLanguage as LanguageCode,
    locale: row.locale,
    level: (row.level as LevelCode | null) ?? null,
    promptText: row.promptText,
    answerText: row.answerText,
    userAnswer: row.userAnswer,
    correctedAnswer: row.correctedAnswer,
    score: row.score,
    isCorrect: row.isCorrect,
    mistakes: row.mistakes,
    notes: row.notes ?? undefined,
    wordBreakdown: row.wordBreakdown ?? [],
    createdAt: row.createdAt.toISOString(),
  }
}
