import { assertCanSpend, canSpend } from '../../user/application/access'
import { assertSpendEnabled } from '../../settings/application/appSettings'
import * as sentenceRepository from '../persistence/sentenceRepository'
import type { CorpusSlice } from '../persistence/sentenceRepository'
import {
  COLD_START_SIZE,
  REFILL_THRESHOLD,
  refillPool,
  triggerBackgroundRefill,
  type PoolInput,
} from './sentencePool'
import {
  selectNext,
  unseenCount,
  buildReviewSignal,
  EMPTY_SIGNAL,
  DEFAULT_WEIGHTS,
  type CorpusCandidate,
  type ReviewSignal,
} from '../domain/selectSentence'
import { toSentenceView, type SentenceView } from '../domain/Sentence'
import { recordEventSafe } from '../../analytics/application/recordEvent'

// How many of the user's most recent attempts feed the review signal — a short window so review
// tracks what they're currently struggling with rather than ancient history.
const RECENT_ATTEMPT_WINDOW = 25

// Lightweight usage metric (Epic 16). Best-effort and off the critical path — serving the
// sentence must never depend on the event landing.
function trackSentenceShown(input: PoolInput): void {
  void recordEventSafe({
    name: 'sentence_shown',
    userId: input.user.id,
    props: {
      learnLanguage: input.learnLanguage,
      guessLanguage: input.guessLanguage,
      locale: input.locale,
      level: input.level ?? null,
    },
  })
}

function sliceOf(input: PoolInput): CorpusSlice {
  return {
    learnLanguage: input.learnLanguage,
    guessLanguage: input.guessLanguage,
    locale: input.locale,
    level: input.level,
  }
}

function toCandidates(
  rows: { id: string; createdAt: Date; theme: string | null }[]
): CorpusCandidate[] {
  return rows.map((r) => ({ id: r.id, createdAt: r.createdAt, theme: r.theme }))
}

// The weighted picker only consults the review signal once unseen material is scarce enough to enter
// "review mode" (the same threshold the policy uses). While fresh sentences are plentiful we skip the
// extra attempts query on the hot path and hand the picker an empty signal.
async function loadReviewSignal(
  userId: string,
  slice: CorpusSlice,
  unseen: number
): Promise<ReviewSignal> {
  if (unseen >= DEFAULT_WEIGHTS.reviewWhenUnseenBelow) return EMPTY_SIGNAL
  return buildReviewSignal(
    await sentenceRepository.listRecentAttemptSignals(userId, slice, RECENT_ATTEMPT_WINDOW)
  )
}

export async function getNextSentence(input: PoolInput): Promise<SentenceView> {
  // A non-approved account may not spend the operator key, and the global spend pause
  // blocks everyone but admins.
  assertCanSpend(input.user)
  await assertSpendEnabled(input.user)
  const slice = sliceOf(input)

  let corpus = await sentenceRepository.listCorpus(slice)
  if (corpus.length === 0) {
    // Cold start: this slice has no shared corpus yet. Generate a single sentence inline so the
    // user waits as little as possible, then top the corpus up off the critical path.
    await refillPool(input, COLD_START_SIZE)
    triggerBackgroundRefill(input)
    corpus = await sentenceRepository.listCorpus(slice)
  }

  const exposures = await sentenceRepository.listExposures(input.user.id, slice)
  const candidates = toCandidates(corpus)
  const unseen = unseenCount(candidates, exposures)

  // Refill signal is now "unseen-for-this-user" rather than a raw pool count: when this learner is
  // running low on never-shown sentences, warm the shared corpus in the background. (Below that we
  // still serve immediately — the weighted policy resurfaces seen sentences for review.)
  if (unseen < REFILL_THRESHOLD) triggerBackgroundRefill(input)

  const signal = await loadReviewSignal(input.user.id, slice, unseen)
  const sentenceId = selectNext(candidates, exposures, signal)
  const sentence = sentenceId ? corpus.find((c) => c.id === sentenceId) : null
  if (!sentence) {
    throw new Error('sentence corpus empty after refill')
  }

  await sentenceRepository.recordExposure(input.user.id, sentence.id)
  trackSentenceShown(input)
  return toSentenceView(sentence)
}

// Consume-only variant for the /api/me bootstrap (perf #5). It serves a sentence ONLY if the
// shared corpus is already warm — it never blocks on Claude generation, because /api/me is hit on
// every app load and must stay fast. Cold corpus -> null (the client then falls back to the normal
// blocking /api/sentence path). Either way it nudges the corpus toward full.
export async function getBootstrapSentence(input: PoolInput): Promise<SentenceView | null> {
  // Bootstrap rides on /api/me, so degrade silently (no sentence) for a non-approved
  // account rather than throwing — the gate is enforced loudly on /api/sentence.
  if (!canSpend(input.user)) return null
  const slice = sliceOf(input)

  const corpus = await sentenceRepository.listCorpus(slice)
  if (corpus.length === 0) {
    // Cold corpus on app boot: warm it in the background so practice stops being cold a beat
    // sooner. We still return null — there's nothing to serve yet — and the client falls back to
    // the blocking /api/sentence path, which inline-generates one. The slice-keyed in-flight guard
    // dedupes this against that fallback's refill, so the corpus tops up just once.
    triggerBackgroundRefill(input)
    return null
  }

  const exposures = await sentenceRepository.listExposures(input.user.id, slice)
  const candidates = toCandidates(corpus)
  const unseen = unseenCount(candidates, exposures)
  if (unseen < REFILL_THRESHOLD) triggerBackgroundRefill(input)

  const signal = await loadReviewSignal(input.user.id, slice, unseen)
  const sentenceId = selectNext(candidates, exposures, signal)
  const sentence = sentenceId ? corpus.find((c) => c.id === sentenceId) : null
  if (!sentence) return null

  // Record the exposure so the ledger reflects the bootstrap-served sentence (mirrors the
  // original "take" semantics). Analytics `sentence_shown` stays on the /api/sentence path only,
  // as before — bootstrap deliberately doesn't emit it.
  await sentenceRepository.recordExposure(input.user.id, sentence.id)
  return toSentenceView(sentence)
}
