import type { UserRow } from '../../../infrastructure/db/schema'
import type { LanguageCode, LocaleCode } from '../../../../shared/languages'
import type { LevelCode } from '../../../../shared/levels'
import { resolveAnthropicClient } from '../../apiKey/application/resolveAnthropicClient'
import { assertCanSpend, canSpend } from '../../user/application/access'
import * as sentenceRepository from '../persistence/sentenceRepository'
import { generateSentenceBatch } from './generateSentenceBatch'
import { toSentenceView, type SentenceView } from '../domain/Sentence'

// Keep a small buffer so we can serve instantly while a refill runs in the
// background. A request only ever BLOCKS on generation when the pool is empty;
// below the threshold (but non-empty) we serve from the buffer and top up off
// the critical path.
const REFILL_THRESHOLD = 3

interface GetNextSentenceInput {
  user: UserRow
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
  level?: LevelCode
}

// In-process guard so overlapping requests for the same pool don't kick off
// duplicate background generations. Single-instance deployment, so a plain Set
// suffices; on multi-instance the worst case is an occasional extra batch
// (harmless — both batches are usable). Resets on restart, which is fine.
const refillsInFlight = new Set<string>()

function poolKey(input: GetNextSentenceInput): string {
  return `${input.user.id}|${input.learnLanguage}|${input.guessLanguage}|${input.locale}|${input.level ?? ''}`
}

async function refillPool(input: GetNextSentenceInput): Promise<void> {
  const anthropic = resolveAnthropicClient(input.user)
  const batch = await generateSentenceBatch(anthropic, {
    learnLanguage: input.learnLanguage,
    guessLanguage: input.guessLanguage,
    locale: input.locale,
    level: input.level,
  })
  await sentenceRepository.insertBatch(
    batch.map((s) => ({
      userId: input.user.id,
      learnLanguage: input.learnLanguage,
      guessLanguage: input.guessLanguage,
      locale: input.locale,
      promptText: s.promptText,
      answerText: s.answerText,
      level: s.level,
      wordBreakdown: s.wordBreakdown,
    }))
  )
}

// Fire-and-forget refill, off the request's critical path. Never rejects — a
// failed background refill just leaves the pool low, and the next request retries
// (or, if it drains the pool, generates inline).
function triggerBackgroundRefill(input: GetNextSentenceInput): void {
  const key = poolKey(input)
  if (refillsInFlight.has(key)) return
  refillsInFlight.add(key)
  void refillPool(input)
    .catch((err) => {
      console.error('[sentence/refill] background refill failed', err)
    })
    .finally(() => {
      refillsInFlight.delete(key)
    })
}

export async function getNextSentence(input: GetNextSentenceInput): Promise<SentenceView> {
  // Access gate: a non-approved account may not spend the operator key (Epic 12).
  assertCanSpend(input.user)
  const filter = {
    userId: input.user.id,
    learnLanguage: input.learnLanguage,
    guessLanguage: input.guessLanguage,
    locale: input.locale,
    level: input.level,
  }

  const count = await sentenceRepository.countUnconsumed(filter)
  if (count === 0) {
    // Cold start / drained pool: nothing to serve, so we must generate inline.
    await refillPool(input)
  } else if (count < REFILL_THRESHOLD) {
    // Buffer running low but non-empty: serve now, top up in the background.
    triggerBackgroundRefill(input)
  }

  const sentence = await sentenceRepository.takeNextUnconsumed(filter)
  if (!sentence) {
    throw new Error('sentence_cache empty after refill')
  }
  return toSentenceView(sentence)
}

// Consume-only variant for the /api/me bootstrap (perf #5). It serves a sentence ONLY if
// the pool is already warm — it never blocks on Claude generation, because /api/me is hit
// on every app load and must stay fast. Cold pool -> null (the client then falls back to
// the normal blocking /api/sentence path). Either way it nudges the pool toward full.
export async function getBootstrapSentence(
  input: GetNextSentenceInput
): Promise<SentenceView | null> {
  // Bootstrap rides on /api/me, so degrade silently (no sentence) for a non-approved
  // account rather than throwing — the gate is enforced loudly on /api/sentence.
  if (!canSpend(input.user)) return null
  const filter = {
    userId: input.user.id,
    learnLanguage: input.learnLanguage,
    guessLanguage: input.guessLanguage,
    locale: input.locale,
    level: input.level,
  }

  const count = await sentenceRepository.countUnconsumed(filter)
  if (count === 0) return null
  if (count < REFILL_THRESHOLD) triggerBackgroundRefill(input)

  const sentence = await sentenceRepository.takeNextUnconsumed(filter)
  return sentence ? toSentenceView(sentence) : null
}
