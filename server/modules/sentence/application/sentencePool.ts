import type { NewSentenceRow, UserRow } from '../../../infrastructure/db/schema'
import type { LanguageCode, LocaleCode } from '../../../../shared/languages'
import type { LevelCode } from '../../../../shared/levels'
import {
  getOperatorAnthropicClient,
  SENTENCE_MODEL,
} from '../../../infrastructure/claude/anthropicClient'
import { createMessageBatch } from '../../../infrastructure/claude/batchClient'
import type { TokenUsage } from '../../../infrastructure/claude/pricing'
import { recordUsage } from '../../showback/application/recordUsage'
import * as sentenceRepository from '../persistence/sentenceRepository'
import type { CorpusSlice } from '../persistence/sentenceRepository'
import * as batchJobRepository from '../persistence/batchJobRepository'
import { contentHash } from '../domain/contentHash'
import type { GeneratedSentence } from '../domain/Sentence'
import {
  BATCH_SIZE,
  buildSentenceMessageParams,
  generateSentenceBatch,
} from './generateSentenceBatch'

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

function sliceOf(input: PoolInput): CorpusSlice {
  return {
    learnLanguage: input.learnLanguage,
    guessLanguage: input.guessLanguage,
    locale: input.locale,
    level: input.level,
  }
}

// Map a freshly generated batch onto shared-corpus rows. Each sentence keeps its OWN level (a
// mixed-level batch lands rows at several levels), and the batch's token cost is amortized evenly
// across its sentences so every row carries a cost-per-sentence (the whole batch was one API call).
// Floored ints — close enough for the informational cost-per-served-sentence the corpus exposes.
// `batchId` tags rows that came from a half-price Message Batch (Epic 22); null for inline rows.
export function toCorpusRows(
  slice: { learnLanguage: LanguageCode; guessLanguage: LanguageCode; locale: LocaleCode },
  sentences: GeneratedSentence[],
  usage: TokenUsage,
  batchId: string | null
): NewSentenceRow[] {
  const n = sentences.length
  const genInputTokens = Math.floor(usage.inputTokens / n)
  const genOutputTokens = Math.floor(usage.outputTokens / n)
  const genCachedInputTokens = Math.floor(usage.cacheReadInputTokens / n)
  return sentences.map((s) => ({
    learnLanguage: slice.learnLanguage,
    guessLanguage: slice.guessLanguage,
    locale: slice.locale,
    level: s.level,
    promptText: s.promptText,
    answerText: s.answerText,
    wordBreakdown: s.wordBreakdown,
    theme: s.theme,
    contentHash: contentHash(s.promptText),
    genInputTokens,
    genOutputTokens,
    genCachedInputTokens,
    batchId,
  }))
}

// SYNCHRONOUS, full-price refill — used only on the cold-start critical path (empty corpus, a user
// waiting). Generates inline so the first sentence of a brand-new slice returns promptly; the rest
// is then warmed off the critical path by the half-price batch in triggerBackgroundRefill.
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
  // corpus. Never let a usage-recording failure fail the refill. (Inline = normal rate.)
  recordUsage({
    userId: input.user.id,
    operation: 'sentence_batch',
    model: SENTENCE_MODEL,
    usage,
  }).catch((err) => console.error('[showback] recordUsage(sentence_batch) failed:', err))

  // Insert into the SHARED corpus — keyed on (pair, locale, level, contentHash), so a sentence
  // another user already generated is de-duplicated away rather than stored per-user.
  await sentenceRepository.insertCorpus(toCorpusRows(input, sentences, usage, null))
}

// Encode a slice into a custom_id for the batch request. base64url keeps it within the API's
// `[A-Za-z0-9_-]` custom_id charset; we don't need to decode it (the job row carries the slice),
// it's just a stable per-request id.
function sliceCustomId(slice: CorpusSlice): string {
  const key = `${slice.learnLanguage}|${slice.guessLanguage}|${slice.locale}|${slice.level ?? ''}`
  return Buffer.from(key).toString('base64url')
}

// Fire-and-forget background refill, off the request's critical path. Submits a half-price Message
// Batch for the slice and records a durable job so the collector can drain it later — replacing the
// old in-memory `refillsInFlight` Set with a jobs-table guard that survives restarts and dedupes
// across instances. Never rejects: a failed submit just leaves the corpus low, and the next request
// retries (or, if it drains the corpus, cold-starts inline).
export function triggerBackgroundRefill(input: PoolInput): void {
  void submitBackgroundFill(input).catch((err) => {
    console.error('[sentence/refill] background batch submit failed', err)
  })
}

async function submitBackgroundFill(input: PoolInput): Promise<void> {
  const slice = sliceOf(input)

  // Durable dedupe: skip if a fill is already in flight (or being collected) for this exact slice,
  // so two learners on the same `(pair, locale, level)` don't both submit a batch. Small race
  // between this check and insertJob below — worst case an extra batch, which is harmless (every
  // sentence lands in the shared corpus and is reusable).
  if (await batchJobRepository.hasInFlightJob(slice)) return

  const anthropic = getOperatorAnthropicClient()
  const params = buildSentenceMessageParams(
    {
      learnLanguage: input.learnLanguage,
      guessLanguage: input.guessLanguage,
      locale: input.locale,
      level: input.level,
    },
    BATCH_SIZE
  )
  const batchId = await createMessageBatch(anthropic, [{ customId: sliceCustomId(slice), params }])

  // Attribute the eventual spend to the user who warmed the corpus, same as the inline path.
  await batchJobRepository.insertJob({
    batchId,
    userId: input.user.id,
    learnLanguage: input.learnLanguage,
    guessLanguage: input.guessLanguage,
    locale: input.locale,
    level: input.level ?? null,
    count: BATCH_SIZE,
  })
}
