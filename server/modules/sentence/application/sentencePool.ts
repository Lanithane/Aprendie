import type { UserRow } from '../../../infrastructure/db/schema'
import type { LanguageCode, LocaleCode } from '../../../../shared/languages'
import type { LevelCode } from '../../../../shared/levels'
import {
  getOperatorAnthropicClient,
  SENTENCE_MODEL,
} from '../../../infrastructure/claude/anthropicClient'
import { recordUsage } from '../../showback/application/recordUsage'
import * as sentenceRepository from '../persistence/sentenceRepository'
import { contentHash } from '../domain/contentHash'
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

// Identifies one serving/warming request: the shared corpus `(learn, guess, locale, level)` slice
// plus the user it serves (needed for spend attribution and the access gates). `user` no longer
// keys the corpus — it's shared — so the in-flight guard below dedupes per SLICE across all users.
export interface PoolInput {
  user: UserRow
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
  level?: LevelCode
}

// Slice key for the in-flight guard — deliberately user-independent so two learners on the same
// `(pair, locale, level)` don't both kick off a fill for the one shared corpus.
function poolKey(input: PoolInput): string {
  return `${input.learnLanguage}|${input.guessLanguage}|${input.locale}|${input.level ?? ''}`
}

export async function refillPool(input: PoolInput, count?: number): Promise<void> {
  const anthropic = getOperatorAnthropicClient()
  const { sentences, usage } = await generateSentenceBatch(
    anthropic,
    {
      learnLanguage: input.learnLanguage,
      guessLanguage: input.guessLanguage,
      locale: input.locale,
      level: input.level,
    },
    count
  )

  // Snapshot the batch's spend for showback, attributed to the user whose request warmed the
  // corpus. Never let a usage-recording failure fail the refill.
  recordUsage({
    userId: input.user.id,
    operation: 'sentence_batch',
    model: SENTENCE_MODEL,
    usage,
  }).catch((err) => console.error('[showback] recordUsage(sentence_batch) failed:', err))

  // Amortize the batch's token cost across its sentences so every corpus row carries a
  // cost-per-sentence (the whole batch was one API call). Floored ints — close enough for the
  // informational cost-per-served-sentence the corpus is meant to expose.
  const n = sentences.length
  const genInputTokens = Math.floor(usage.inputTokens / n)
  const genOutputTokens = Math.floor(usage.outputTokens / n)
  const genCachedInputTokens = Math.floor(usage.cacheReadInputTokens / n)

  // Insert into the SHARED corpus — keyed on (pair, locale, level, contentHash), so a sentence
  // another user already generated is de-duplicated away rather than stored per-user.
  await sentenceRepository.insertCorpus(
    sentences.map((s) => ({
      learnLanguage: input.learnLanguage,
      guessLanguage: input.guessLanguage,
      locale: input.locale,
      level: s.level,
      promptText: s.promptText,
      answerText: s.answerText,
      wordBreakdown: s.wordBreakdown,
      theme: s.theme,
      contentHash: contentHash(s.promptText),
      genInputTokens,
      genOutputTokens,
      genCachedInputTokens,
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
