import { canSpend } from '../../user/application/access'
import { getSettings } from '../../settings/application/appSettings'
import * as sentenceRepository from '../persistence/sentenceRepository'
import {
  REFILL_THRESHOLD,
  refillPool,
  triggerBackgroundRefill,
  type PoolInput,
} from './sentencePool'

// Onboarding warms with a small inline batch (during a brief "preparing…" transition) so the
// learner lands on a non-cold pool; the full top-up then runs in the background. Bigger than the
// COLD_START_SIZE of 1 used on the blocking path because here we're deliberately spending a couple
// of seconds to bank a small buffer, not racing to serve a single sentence.
const PREWARM_BATCH = 3

export interface PrewarmResult {
  // How many unconsumed sentences the pool holds after warming.
  pooled: number
}

// Pre-generate sentences for a chosen pool ahead of the first request (Epic 11). Fired when the
// onboarding wizard completes. Rides the onboarding path, so it degrades silently (no throw) when
// the account can't spend or spend is globally paused — the loud gate lives on /api/sentence and
// /api/correct, and the user would hit it there instead.
export async function prewarmPool(input: PoolInput): Promise<PrewarmResult> {
  if (!canSpend(input.user)) return { pooled: 0 }
  if (input.user.role !== 'admin' && (await getSettings()).spendPaused) return { pooled: 0 }

  const filter = {
    userId: input.user.id,
    learnLanguage: input.learnLanguage,
    guessLanguage: input.guessLanguage,
    locale: input.locale,
    level: input.level,
  }

  const count = await sentenceRepository.countUnconsumed(filter)
  // Already warm enough to serve instantly — don't spend.
  if (count >= REFILL_THRESHOLD) return { pooled: count }

  // Cold pool: generate a small batch inline so the first sentence is ready the moment the user
  // lands on practice. A low-but-non-empty pool is already serveable, so we skip the inline batch.
  if (count === 0) await refillPool(input, PREWARM_BATCH)

  // Top up to a full pool in the background either way.
  triggerBackgroundRefill(input)

  return { pooled: await sentenceRepository.countUnconsumed(filter) }
}
