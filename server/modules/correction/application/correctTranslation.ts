import type { UserRow, SentenceRow } from '../../../infrastructure/db/schema'
import type { LanguageCode } from '../../../../shared/languages'
import type { LevelCode } from '../../../../shared/levels'
import {
  getOperatorAnthropicClient,
  CORRECTION_MODEL,
} from '../../../infrastructure/claude/anthropicClient'
import { assertCanSpend } from '../../user/application/access'
import { assertSpendEnabled } from '../../settings/application/appSettings'
import { assertWithinDailyCap, recordGradedSentence } from '../../usage/application/dailyCap'
import { recordUsage } from '../../showback/application/recordUsage'
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
  // Grading spends the operator key: assert the account is allowed to spend, that the
  // global spend pause is off, then enforce the daily cap (admins are exempt).
  assertCanSpend(input.user)
  await assertSpendEnabled(input.user)
  const capped = input.user.role !== 'admin'
  if (capped) await assertWithinDailyCap(input.user)

  const sentence: SentenceRow | null = await sentenceRepository.findForUser(
    input.user.id,
    input.sentenceId
  )
  if (!sentence) throw new SentenceNotFoundError()

  const learnLanguage = sentence.learnLanguage as LanguageCode
  const guessLanguage = sentence.guessLanguage as LanguageCode
  const locale = sentence.locale
  const level = (sentence.level as LevelCode | null) ?? null

  const anthropic = getOperatorAnthropicClient()
  const { result, usage } = await scoreTranslation(anthropic, {
    learnLanguage,
    guessLanguage,
    locale,
    promptText: sentence.promptText,
    answerText: sentence.answerText,
    userAnswer: input.userAnswer,
  })

  // Snapshot the spend for showback. Never let a usage-recording failure fail the grade.
  recordUsage({
    userId: input.user.id,
    operation: 'correction',
    model: CORRECTION_MODEL,
    usage,
  }).catch((err) => console.error('[showback] recordUsage(correction) failed:', err))

  // Persist a denormalized snapshot of this attempt (the single source for the history view).
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
    grade: result.grade,
    isCorrect: result.isCorrect,
    mistakes: result.mistakes,
    notes: result.notes,
    wordBreakdown: sentence.wordBreakdown ?? [],
  })

  // Record every graded sentence (including admins) so the admin "Graded today" tile
  // reflects all activity. The cap is only *enforced* for non-admins (asserted above);
  // counting an admin's sentences here never blocks them, since they skip that check.
  await recordGradedSentence(input.user.id)

  return {
    sentenceId: sentence.id,
    learnLanguage,
    guessLanguage,
    locale,
    level,
    promptText: sentence.promptText,
    answerText: sentence.answerText,
    userAnswer: input.userAnswer,
    wordBreakdown: sentence.wordBreakdown ?? [],
    ...result,
  }
}
