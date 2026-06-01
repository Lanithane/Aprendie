import type { LanguageCode, LocaleCode, WordToken } from '../../../../shared/languages'
import type { LevelCode } from '../../../../shared/levels'
import * as historyRepository from '../persistence/historyRepository'
import { toAttemptView, type AttemptMistake, type AttemptView } from '../domain/Attempt'
import { recordSeenWords } from '../../palabradex/application/recordSeenWords'

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

  // Fold this attempt into the per-user word Palabradex (cross-module orchestration). It's a
  // derived aggregate keyed off the snapshot we just inserted, so a failure here must never
  // lose the graded attempt the user just earned — best-effort, log and move on.
  try {
    await recordSeenWords({
      userId: input.userId,
      learnLanguage: input.learnLanguage,
      wordBreakdown: input.wordBreakdown,
      mistakes: input.mistakes,
      seenAt: row.createdAt,
    })
  } catch (err) {
    console.error('[recordAttempt] recordSeenWords failed (palabradex skipped):', err)
  }

  return toAttemptView(row)
}
