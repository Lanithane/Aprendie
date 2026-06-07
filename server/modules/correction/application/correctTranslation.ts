import type { UserRow, SentenceRow } from '../../../infrastructure/db/schema'
import type { LanguageCode, LocaleCode } from '../../../../shared/languages'
import type { LevelCode } from '../../../../shared/levels'
import {
  getOperatorAnthropicClient,
  CORRECTION_MODEL,
} from '../../../infrastructure/claude/anthropicClient'
import type { TokenUsage } from '../../../infrastructure/claude/pricing'
import { assertCanSpend } from '../../user/application/access'
import { assertSpendEnabled } from '../../settings/application/appSettings'
import { assertWithinDailyCap, recordGradedSentence } from '../../usage/application/dailyCap'
import { recordStreakActivity } from '../../user/application/recordStreakActivity'
import { recordUsage } from '../../showback/application/recordUsage'
import * as sentenceRepository from '../../sentence/persistence/sentenceRepository'
import { recordAttempt } from '../../history/application/recordAttempt'
import { scoreTranslation, scoreTranslationStream } from './scoreTranslation'
import type { CorrectionResult, CorrectionView } from '../domain/Correction'

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

// The resolved, gated slice a grade runs against — shared by the blocking and streaming paths.
interface GradeContext {
  sentence: SentenceRow
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
  level: LevelCode | null
}

// Run the spend gates and resolve the sentence. Throws before any model call: a non-approved or
// spend-paused account, a capped non-admin, or an unknown sentence id never reaches the grader.
async function gateAndLoad(input: CorrectInput): Promise<GradeContext> {
  // Grading spends the operator key: assert the account is allowed to spend, then that the
  // global spend pause is off (the cheap cached kill-switch) before doing any work.
  assertCanSpend(input.user)
  await assertSpendEnabled(input.user)

  // The cap check (countToday) and the sentence lookup are independent DB reads, so run them
  // concurrently and await in priority order — error precedence stays cap-then-not-found, and the
  // noop catch keeps a rejected lookup from surfacing as an unhandled rejection if the cap throws
  // first. The corpus is shared (Epic 20), so grading just resolves the sentence by id; the id came
  // from a sentence we served this user, so there's no per-user ownership to assert.
  const capped = input.user.role !== 'admin'
  const capCheck = capped ? assertWithinDailyCap(input.user) : Promise.resolve()
  const sentenceLookup = sentenceRepository.findById(input.sentenceId)
  sentenceLookup.catch(() => {})

  await capCheck
  const sentence = await sentenceLookup
  if (!sentence) throw new SentenceNotFoundError()

  return {
    sentence,
    learnLanguage: sentence.learnLanguage as LanguageCode,
    guessLanguage: sentence.guessLanguage as LanguageCode,
    locale: sentence.locale,
    level: (sentence.level as LevelCode | null) ?? null,
  }
}

function scoreInputFor(ctx: GradeContext, userAnswer: string) {
  return {
    learnLanguage: ctx.learnLanguage,
    guessLanguage: ctx.guessLanguage,
    locale: ctx.locale,
    promptText: ctx.sentence.promptText,
    answerText: ctx.sentence.answerText,
    userAnswer,
  }
}

// Record showback + history + the daily counter for a completed grade and shape the view. Shared
// tail of both paths: usage snapshot is fire-and-forget; the attempt insert and the cap bump run
// concurrently (different tables) so the response isn't gated on two serial writes.
async function persistGrade(
  input: CorrectInput,
  ctx: GradeContext,
  result: CorrectionResult,
  usage: TokenUsage
): Promise<CorrectionView> {
  recordUsage({
    userId: input.user.id,
    operation: 'correction',
    model: CORRECTION_MODEL,
    usage,
  }).catch((err) => console.error('[showback] recordUsage(correction) failed:', err))

  const [, dailyUsage, streak] = await Promise.all([
    recordAttempt({
      userId: input.user.id,
      sentenceId: ctx.sentence.id,
      learnLanguage: ctx.learnLanguage,
      guessLanguage: ctx.guessLanguage,
      locale: ctx.locale,
      level: ctx.level,
      promptText: ctx.sentence.promptText,
      answerText: ctx.sentence.answerText,
      userAnswer: input.userAnswer,
      correctedAnswer: result.correctedAnswer,
      score: result.score,
      grade: result.grade,
      isCorrect: result.isCorrect,
      mistakes: result.mistakes,
      notes: result.notes,
      wordBreakdown: ctx.sentence.wordBreakdown ?? [],
    }),
    // recordGradedSentence counts every graded sentence (including admins) so the admin "Graded
    // today" tile reflects all activity; the cap is only *enforced* for non-admins (gated above),
    // so counting an admin's sentence here never blocks them. Its snapshot rides back in the view
    // so the client's near-cap banner updates from the grade response.
    recordGradedSentence(input.user),
    // Advance the consecutive-day streak (no-op past today's first activity); its snapshot rides
    // back so the indicator pops on advance without a refetch.
    recordStreakActivity(input.user),
  ])

  return {
    sentenceId: ctx.sentence.id,
    learnLanguage: ctx.learnLanguage,
    guessLanguage: ctx.guessLanguage,
    locale: ctx.locale,
    level: ctx.level,
    promptText: ctx.sentence.promptText,
    answerText: ctx.sentence.answerText,
    userAnswer: input.userAnswer,
    wordBreakdown: ctx.sentence.wordBreakdown ?? [],
    dailyUsage,
    streak,
    ...result,
  }
}

// Blocking grade: gate, score in one shot, persist, return the full view. Backs the non-streaming
// /api/correct endpoint, which the client falls back to if the stream drops mid-grade.
export async function correctTranslation(input: CorrectInput): Promise<CorrectionView> {
  const ctx = await gateAndLoad(input)
  const { result, usage } = await scoreTranslation(
    getOperatorAnthropicClient(),
    scoreInputFor(ctx, input.userAnswer)
  )
  return persistGrade(input, ctx, result, usage)
}

// Streaming grade: same gate → score → persist, but the model call streams and `onDelta` fires for
// each text delta so the controller can forward a live preview over SSE. Gate/lookup errors still
// throw before the first delta, so the controller can answer them as a normal HTTP error.
export async function correctTranslationStreaming(
  input: CorrectInput,
  onDelta: (delta: string) => void,
  signal?: AbortSignal
): Promise<CorrectionView> {
  const ctx = await gateAndLoad(input)
  const { result, usage } = await scoreTranslationStream(
    getOperatorAnthropicClient(),
    scoreInputFor(ctx, input.userAnswer),
    onDelta,
    signal
  )
  return persistGrade(input, ctx, result, usage)
}
