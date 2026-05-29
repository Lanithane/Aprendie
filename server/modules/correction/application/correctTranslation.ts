import type { UserRow, SentenceRow } from '../../../infrastructure/db/schema'
import type { LanguageCode } from '../../../../shared/languages'
import type { LevelCode } from '../../../../shared/levels'
import { anthropicClientForUser } from '../../apiKey/application/anthropicClientForUser'
import * as sentenceRepository from '../../sentence/persistence/sentenceRepository'
import { recordAttempt } from '../../history/application/recordAttempt'
import { scoreTranslation } from './scoreTranslation'
import type { CorrectionView } from '../domain/Correction'

interface CorrectInput {
  user: UserRow
  sentenceId: string
  userAnswer: string
}

export class SentenceNotFoundError extends Error {
  constructor() {
    super('sentence not found')
    this.name = 'SentenceNotFoundError'
  }
}

export async function correctTranslation(input: CorrectInput): Promise<CorrectionView> {
  const sentence: SentenceRow | null = await sentenceRepository.findForUser(
    input.user.id,
    input.sentenceId
  )
  if (!sentence) throw new SentenceNotFoundError()

  const learnLanguage = sentence.learnLanguage as LanguageCode
  const guessLanguage = sentence.guessLanguage as LanguageCode
  const locale = sentence.locale
  const level = (sentence.level as LevelCode | null) ?? null

  const anthropic = anthropicClientForUser(input.user)
  const result = await scoreTranslation(anthropic, {
    learnLanguage,
    guessLanguage,
    locale,
    promptText: sentence.promptText,
    answerText: sentence.answerText,
    userAnswer: input.userAnswer,
  })

  // Persist a denormalized snapshot of this attempt (the single source for the
  // History view and the Epic 8 Pokédex).
  await recordAttempt({
    userId: input.user.id,
    sentenceId: sentence.id,
    learnLanguage,
    guessLanguage,
    locale,
    level,
    promptText: sentence.promptText,
    answerText: sentence.answerText,
    userAnswer: input.userAnswer,
    correctedAnswer: result.correctedAnswer,
    score: result.score,
    isCorrect: result.isCorrect,
    mistakes: result.mistakes,
    notes: result.notes,
    wordBreakdown: sentence.wordBreakdown ?? [],
  })

  return {
    sentenceId: sentence.id,
    learnLanguage,
    guessLanguage,
    locale,
    level,
    promptText: sentence.promptText,
    answerText: sentence.answerText,
    userAnswer: input.userAnswer,
    ...result,
  }
}
