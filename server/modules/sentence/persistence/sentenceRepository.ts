import { and, eq, sql, type SQL } from 'drizzle-orm'
import { db } from '../../../infrastructure/db/client'
import {
  sentences,
  sentenceExposures,
  type SentenceRow,
  type NewSentenceRow,
} from '../../../infrastructure/db/schema'
import type { LanguageCode, LocaleCode } from '../../../../shared/languages'
import type { LevelCode } from '../../../../shared/levels'

// A slice of the shared corpus: the `(pair, locale, level)` coordinates every read/write filters
// on. `level` is optional only to mirror the serving callers' optional level; in practice serving
// always carries a concrete level (a user picks one before practicing).
export interface CorpusSlice {
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
  level?: LevelCode
}

function sliceFilters(slice: CorpusSlice): SQL[] {
  const base: SQL[] = [
    eq(sentences.learnLanguage, slice.learnLanguage),
    eq(sentences.guessLanguage, slice.guessLanguage),
    eq(sentences.locale, slice.locale),
  ]
  if (slice.level !== undefined) base.push(eq(sentences.level, slice.level))
  return base
}

// Insert freshly generated sentences into the shared corpus, de-duplicating on the content key.
// `onConflictDoNothing` means a sentence already in the corpus is silently skipped (its original
// amortized token cost is kept — we never re-attribute a duplicate).
export async function insertCorpus(rows: NewSentenceRow[]): Promise<void> {
  if (rows.length === 0) return
  await db
    .insert(sentences)
    .values(rows)
    .onConflictDoNothing({
      target: [
        sentences.learnLanguage,
        sentences.guessLanguage,
        sentences.locale,
        sentences.level,
        sentences.contentHash,
      ],
    })
}

// Every corpus sentence on the slice. The slice is small (one pair/locale/level), so we load it
// whole and let the pure picker choose — no DB-side ordering policy leaks into persistence.
export async function listCorpus(slice: CorpusSlice): Promise<SentenceRow[]> {
  return db
    .select()
    .from(sentences)
    .where(and(...sliceFilters(slice)))
}

// This user's exposure rows for the slice (joined so we only return ledger entries whose sentence
// is actually in this slice). Feeds the picker's "seen vs unseen" split.
export interface ExposureRow {
  sentenceId: string
  seenCount: number
  lastSeenAt: Date
}

export async function listExposures(userId: string, slice: CorpusSlice): Promise<ExposureRow[]> {
  return db
    .select({
      sentenceId: sentenceExposures.sentenceId,
      seenCount: sentenceExposures.seenCount,
      lastSeenAt: sentenceExposures.lastSeenAt,
    })
    .from(sentenceExposures)
    .innerJoin(sentences, eq(sentenceExposures.sentenceId, sentences.id))
    .where(and(eq(sentenceExposures.userId, userId), ...sliceFilters(slice)))
}

// Record that `sentenceId` was shown to `userId`. Additive upsert (same pattern as
// palabradexRepository): first sight inserts seenCount=1, repeats bump it and advance `lastSeenAt`,
// while `firstSeenAt` stays pinned to the original.
export async function recordExposure(userId: string, sentenceId: string): Promise<void> {
  const now = new Date()
  await db
    .insert(sentenceExposures)
    .values({ userId, sentenceId, seenCount: 1, firstSeenAt: now, lastSeenAt: now })
    .onConflictDoUpdate({
      target: [sentenceExposures.userId, sentenceExposures.sentenceId],
      set: {
        seenCount: sql`${sentenceExposures.seenCount} + 1`,
        lastSeenAt: now,
      },
    })
}

// Look up a corpus sentence by id — used by grading, which only needs the sentence text (the corpus
// is shared, so there is no per-user ownership to assert; the id came from a sentence we served).
export async function findById(sentenceId: string): Promise<SentenceRow | null> {
  const rows = await db.select().from(sentences).where(eq(sentences.id, sentenceId)).limit(1)
  return rows[0] ?? null
}
