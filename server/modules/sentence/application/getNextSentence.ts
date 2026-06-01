import { assertCanSpend, canSpend } from '../../user/application/access'
import { assertSpendEnabled } from '../../settings/application/appSettings'
import * as sentenceRepository from '../persistence/sentenceRepository'
import {
  COLD_START_SIZE,
  REFILL_THRESHOLD,
  refillPool,
  triggerBackgroundRefill,
  type PoolInput,
} from './sentencePool'
import { toSentenceView, type SentenceView } from '../domain/Sentence'
import { recordEventSafe } from '../../analytics/application/recordEvent'

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

export async function getNextSentence(input: PoolInput): Promise<SentenceView> {
  // A non-approved account may not spend the operator key, and the global spend pause
  // blocks everyone but admins.
  assertCanSpend(input.user)
  await assertSpendEnabled(input.user)
  const filter = {
    userId: input.user.id,
    learnLanguage: input.learnLanguage,
    guessLanguage: input.guessLanguage,
    locale: input.locale,
    level: input.level,
  }

  const count = await sentenceRepository.countUnconsumed(filter)
  if (count === 0) {
    // Cold start / drained pool: nothing to serve. Generate a single sentence inline so
    // the user waits as little as possible, then refill the rest of the pool off the
    // critical path so the next Next press is warm.
    await refillPool(input, COLD_START_SIZE)
    triggerBackgroundRefill(input)
  } else if (count < REFILL_THRESHOLD) {
    // Buffer running low but non-empty: serve now, top up in the background.
    triggerBackgroundRefill(input)
  }

  const sentence = await sentenceRepository.takeNextUnconsumed(filter)
  if (!sentence) {
    throw new Error('sentence_cache empty after refill')
  }
  trackSentenceShown(input)
  return toSentenceView(sentence)
}

// Consume-only variant for the /api/me bootstrap (perf #5). It serves a sentence ONLY if
// the pool is already warm — it never blocks on Claude generation, because /api/me is hit
// on every app load and must stay fast. Cold pool -> null (the client then falls back to
// the normal blocking /api/sentence path). Either way it nudges the pool toward full.
export async function getBootstrapSentence(input: PoolInput): Promise<SentenceView | null> {
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
  if (count === 0) {
    // Cold saved pool on app boot: warm it in the background so practice stops being cold a
    // beat sooner (Epic 11's "fire on boot for the returning user's saved pair"). We still
    // return null — there's nothing to serve yet — and the client falls back to the blocking
    // /api/sentence path, which inline-generates one immediately. The in-flight guard dedupes
    // this against that fallback's own refill, so the pool tops up to full just once.
    triggerBackgroundRefill(input)
    return null
  }
  if (count < REFILL_THRESHOLD) triggerBackgroundRefill(input)

  const sentence = await sentenceRepository.takeNextUnconsumed(filter)
  return sentence ? toSentenceView(sentence) : null
}
