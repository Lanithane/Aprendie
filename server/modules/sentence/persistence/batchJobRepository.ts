import { and, eq, isNull, lt, or, type SQL } from 'drizzle-orm'
import { db } from '../../../infrastructure/db/client'
import {
  sentenceBatchJobs,
  type SentenceBatchJobRow,
  type NewSentenceBatchJobRow,
} from '../../../infrastructure/db/schema'
import type { CorpusSlice } from './sentenceRepository'

// A 'collecting' job whose poller crashed mid-drain would otherwise stay claimed forever; after
// this long a claim is treated as abandoned and reclaimed. Generous vs. the actual retrieve+parse
// (seconds), tight enough that a real crash self-heals within one cadence or two.
const STALE_COLLECTING_MS = 10 * 60_000

// Statuses that count as "a fill is already running for this slice" — used by the dedupe guard so
// a slice with a batch in flight (or being collected) isn't resubmitted.
const OPEN_STATUSES: SentenceBatchJobRow['status'][] = ['in_progress', 'collecting']

// Match a job row to a corpus slice, mirroring sentenceRepository.sliceFilters but over the jobs
// table. `level` is nullable here too, so an absent level matches the NULL rows (not eq-to-null).
function sliceFilters(slice: CorpusSlice): SQL[] {
  const base: SQL[] = [
    eq(sentenceBatchJobs.learnLanguage, slice.learnLanguage),
    eq(sentenceBatchJobs.guessLanguage, slice.guessLanguage),
    eq(sentenceBatchJobs.locale, slice.locale),
  ]
  base.push(
    slice.level === undefined
      ? isNull(sentenceBatchJobs.level)
      : eq(sentenceBatchJobs.level, slice.level)
  )
  return base
}

// Is a half-price fill already in flight for this exact slice? The durable replacement for the old
// in-memory `refillsInFlight` Set — survives restarts and dedupes across instances.
export async function hasInFlightJob(slice: CorpusSlice): Promise<boolean> {
  const rows = await db
    .select({ id: sentenceBatchJobs.id })
    .from(sentenceBatchJobs)
    .where(
      and(or(...OPEN_STATUSES.map((s) => eq(sentenceBatchJobs.status, s))), ...sliceFilters(slice))
    )
    .limit(1)
  return rows.length > 0
}

export async function insertJob(row: NewSentenceBatchJobRow): Promise<void> {
  await db.insert(sentenceBatchJobs).values(row)
}

// Atomically claim up to `limit` jobs to collect: open `in_progress` jobs plus any `collecting`
// job left stale by a crashed poller. `FOR UPDATE SKIP LOCKED` means concurrent instances grab
// disjoint sets and never block each other. Claimed rows flip to `collecting` so a second poller
// skips them; the caller drains each and finalizes with markJob{Completed,Failed} / releaseJob.
export async function claimCollectibleJobs(limit: number): Promise<SentenceBatchJobRow[]> {
  const staleBefore = new Date(Date.now() - STALE_COLLECTING_MS)
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(sentenceBatchJobs)
      .where(
        or(
          eq(sentenceBatchJobs.status, 'in_progress'),
          and(
            eq(sentenceBatchJobs.status, 'collecting'),
            lt(sentenceBatchJobs.updatedAt, staleBefore)
          )
        )
      )
      .orderBy(sentenceBatchJobs.createdAt)
      .limit(limit)
      .for('update', { skipLocked: true })
    if (rows.length === 0) return []
    const now = new Date()
    for (const row of rows) {
      await tx
        .update(sentenceBatchJobs)
        .set({ status: 'collecting', updatedAt: now })
        .where(eq(sentenceBatchJobs.id, row.id))
    }
    return rows
  })
}

async function setStatus(id: string, status: SentenceBatchJobRow['status']): Promise<void> {
  await db
    .update(sentenceBatchJobs)
    .set({ status, updatedAt: new Date() })
    .where(eq(sentenceBatchJobs.id, id))
}

export const markJobCompleted = (id: string) => setStatus(id, 'completed')
export const markJobFailed = (id: string) => setStatus(id, 'failed')
// Batch hasn't ended yet: hand the claim back so the next poll retries it.
export const releaseJob = (id: string) => setStatus(id, 'in_progress')
