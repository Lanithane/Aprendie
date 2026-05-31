import type { UserRow } from '../../../infrastructure/db/schema'
import type { LanguageCode, LocaleCode } from '../../../../shared/languages'
import type { LevelCode } from '../../../../shared/levels'
import { getOperatorAnthropicClient } from '../../../infrastructure/claude/anthropicClient'
import * as sentenceRepository from '../persistence/sentenceRepository'
import { generateSentenceBatch } from './generateSentenceBatch'

// Keep a small buffer so we can serve instantly while a refill runs in the
// background. A request only ever BLOCKS on generation when the pool is empty;
// below the threshold (but non-empty) we serve from the buffer and top up off
// the critical path.
export const REFILL_THRESHOLD = 3

// When the pool is empty we have to generate inline, so generate just one sentence —
// a single sentence returns from Claude far faster than a full batch, keeping the first
// load of a new pool (difficulty/language/locale switch) snappy. The rest of the pool is
// then filled by a background refill so the next Next press is already warm.
export const COLD_START_SIZE = 1

// Identifies a single `(user, learn, guess, locale, level)` sentence pool. Shared by every
// path that serves or warms a pool so the in-flight refill guard dedupes across all of them.
export interface PoolInput {
  user: UserRow
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
  level?: LevelCode
}

export function poolKey(input: PoolInput): string {
  return `${input.user.id}|${input.learnLanguage}|${input.guessLanguage}|${input.locale}|${input.level ?? ''}`
}

export async function refillPool(input: PoolInput, count?: number): Promise<void> {
  const anthropic = getOperatorAnthropicClient()
  const batch = await generateSentenceBatch(
    anthropic,
    {
      learnLanguage: input.learnLanguage,
      guessLanguage: input.guessLanguage,
      locale: input.locale,
      level: input.level,
    },
    count
  )
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

// In-process guard so overlapping requests for the same pool don't kick off
// duplicate background generations. Single-instance deployment, so a plain Set
// suffices; on multi-instance the worst case is an occasional extra batch
// (harmless — both batches are usable). Resets on restart, which is fine.
const refillsInFlight = new Set<string>()

// Fire-and-forget refill, off the request's critical path. Never rejects — a
// failed background refill just leaves the pool low, and the next request retries
// (or, if it drains the pool, generates inline).
export function triggerBackgroundRefill(input: PoolInput): void {
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
