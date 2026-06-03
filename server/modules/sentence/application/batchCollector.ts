import {
  getOperatorAnthropicClient,
  SENTENCE_MODEL,
} from '../../../infrastructure/claude/anthropicClient'
import { fetchBatchResults, isBatchEnded } from '../../../infrastructure/claude/batchClient'
import { toTokenUsage, type TokenUsage } from '../../../infrastructure/claude/pricing'
import type { LanguageCode } from '../../../../shared/languages'
import type { LevelCode } from '../../../../shared/levels'
import { recordUsage } from '../../showback/application/recordUsage'
import * as sentenceRepository from '../persistence/sentenceRepository'
import * as batchJobRepository from '../persistence/batchJobRepository'
import type { SentenceBatchJobRow } from '../../../infrastructure/db/schema'
import type { GeneratedSentence } from '../domain/Sentence'
import { parseSentenceResponse } from './generateSentenceBatch'
import { toCorpusRows } from './sentencePool'

// How often the poller drains ended batches, and how many jobs it claims per pass. A batch can take
// up to 24h to complete, so a minute-scale cadence is plenty; this isn't latency-critical (cold
// starts serve synchronously). At ~10 users on a single instance this is comfortably idle.
const POLL_INTERVAL_MS = 60_000
const CLAIM_LIMIT = 25

const ZERO_USAGE: TokenUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheCreationInputTokens: 0,
  cacheReadInputTokens: 0,
}

function addUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheCreationInputTokens: a.cacheCreationInputTokens + b.cacheCreationInputTokens,
    cacheReadInputTokens: a.cacheReadInputTokens + b.cacheReadInputTokens,
  }
}

// Drain one job: if its batch hasn't ended, hand the claim back; otherwise parse every succeeded
// result into the shared corpus (tagged with the batch id and amortized half-price token cost) and
// snapshot the spend at the batch rate, then mark the job done. A batch carries a single slice's
// request here, but we tolerate multiple results defensively.
async function collectJob(
  anthropic: ReturnType<typeof getOperatorAnthropicClient>,
  job: SentenceBatchJobRow
): Promise<void> {
  if (!(await isBatchEnded(anthropic, job.batchId))) {
    await batchJobRepository.releaseJob(job.id)
    return
  }

  const results = await fetchBatchResults(anthropic, job.batchId)
  const level = (job.level as LevelCode | null) ?? undefined
  const collected: GeneratedSentence[] = []
  let usage = ZERO_USAGE
  for (const r of results) {
    if (!r.message) continue // errored / expired / canceled — nothing to collect
    try {
      collected.push(...parseSentenceResponse(r.message, 'sentence/batch-collect', level))
      usage = addUsage(usage, toTokenUsage(r.message.usage))
    } catch (err) {
      // One unparseable result shouldn't sink the rest of the batch.
      console.error('[sentence/collector] unparseable result', job.batchId, err)
    }
  }

  if (collected.length > 0) {
    const slice = {
      learnLanguage: job.learnLanguage as LanguageCode,
      guessLanguage: job.guessLanguage as LanguageCode,
      locale: job.locale,
    }
    await sentenceRepository.insertCorpus(toCorpusRows(slice, collected, usage, job.batchId))
    // Showback at the batch (½) rate, attributed to the user who warmed the corpus. Off the
    // collection's critical path — a showback miss must not strand the job in `collecting`.
    recordUsage({
      userId: job.userId,
      operation: 'sentence_batch',
      model: SENTENCE_MODEL,
      usage,
      batch: true,
    }).catch((err) => console.error('[showback] recordUsage(sentence_batch, batch) failed:', err))
  }

  await batchJobRepository.markJobCompleted(job.id)
}

// One collection pass: claim a slice of open jobs and drain each. A failure on one job marks it
// failed (its half-price tokens are forfeited) and never blocks the others.
export async function collectSentenceBatches(): Promise<void> {
  const jobs = await batchJobRepository.claimCollectibleJobs(CLAIM_LIMIT)
  if (jobs.length === 0) return
  const anthropic = getOperatorAnthropicClient()
  for (const job of jobs) {
    try {
      await collectJob(anthropic, job)
    } catch (err) {
      console.error('[sentence/collector] job failed', job.batchId, err)
      await batchJobRepository.markJobFailed(job.id).catch(() => {})
    }
  }
}

let timer: ReturnType<typeof setInterval> | null = null
let running = false

// Start the background collector interval (idempotent). Guarded so a slow pass never overlaps the
// next tick. Called from main.ts only when an operator key is configured — without it no batches
// are ever submitted, so there'd be nothing to collect.
export function startBatchCollector(): void {
  if (timer) return
  timer = setInterval(() => {
    if (running) return
    running = true
    void collectSentenceBatches()
      .catch((err) => console.error('[sentence/collector] pass failed', err))
      .finally(() => {
        running = false
      })
  }, POLL_INTERVAL_MS)
  // Don't keep the process alive solely for the poller.
  timer.unref?.()
}
