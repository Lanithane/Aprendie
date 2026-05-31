import type { LanguageCode, LocaleCode, WordToken } from '../../../../shared/languages'
import type { LevelCode } from '../../../../shared/levels'
import * as historyRepository from '../persistence/historyRepository'
import { toAttemptView, type AttemptMistake, type AttemptView } from '../domain/Attempt'

export interface RecordAttemptInput {
  userId: string
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
  mistakes: AttemptMistake[]
  notes?: string
  wordBreakdown: WordToken[]
}

export async function recordAttempt(input: RecordAttemptInput): Promise<AttemptView> {
  const row = await historyRepository.insert({
    userId: input.userId,
    sentenceId: input.sentenceId,
    learnLanguage: input.learnLanguage,
    guessLanguage: input.guessLanguage,
    locale: input.locale,
    level: input.level,
    promptText: input.promptText,
    answerText: input.answerText,
    userAnswer: input.userAnswer,
    correctedAnswer: input.correctedAnswer,
    score: input.score,
    grade: input.grade,
    isCorrect: input.isCorrect,
    mistakes: input.mistakes,
    notes: input.notes ?? null,
    wordBreakdown: input.wordBreakdown,
  })
  return toAttemptView(row)
}
