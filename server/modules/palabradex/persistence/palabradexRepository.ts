import { and, asc, desc, eq, gte, sql } from 'drizzle-orm'
import { db } from '../../../infrastructure/db/client'
import {
  lexemeDefinitions,
  lexemeStats,
  lexemeVariantStats,
  type LexemeDefinitionRow,
  type LexemeStatsRow,
  type LexemeVariantStatsRow,
} from '../../../infrastructure/db/schema'
import type { LexemeDelta, VariantDelta } from '../domain/seenWords'
import type { LexemeSort } from '../domain/Lexeme'

// Additive upsert of one attempt's root deltas. Deltas are pre-grouped by lemma (unique within
// an attempt), so a single multi-row INSERT ... ON CONFLICT is safe — no row is touched twice.
// On conflict we accumulate the counts, widen the [first,last]SeenAt window, and keep the
// existing `partOfSpeech` (captured on first sight).
export async function upsertLexemes(
  userId: string,
  learnLanguage: string,
  deltas: LexemeDelta[],
  seenAt: Date
): Promise<void> {
  if (deltas.length === 0) return
  await db
    .insert(lexemeStats)
    .values(
      deltas.map((d) => ({
        userId,
        learnLanguage,
        lemma: d.lemma,
        partOfSpeech: d.partOfSpeech,
        seenCount: d.seen,
        correctCount: d.correct,
        incorrectCount: d.incorrect,
        firstSeenAt: seenAt,
        lastSeenAt: seenAt,
      }))
    )
    .onConflictDoUpdate({
      target: [lexemeStats.userId, lexemeStats.learnLanguage, lexemeStats.lemma],
      set: {
        seenCount: sql`${lexemeStats.seenCount} + excluded.seen_count`,
        correctCount: sql`${lexemeStats.correctCount} + excluded.correct_count`,
        incorrectCount: sql`${lexemeStats.incorrectCount} + excluded.incorrect_count`,
        firstSeenAt: sql`least(${lexemeStats.firstSeenAt}, excluded.first_seen_at)`,
        lastSeenAt: sql`greatest(${lexemeStats.lastSeenAt}, excluded.last_seen_at)`,
      },
    })
}

// Additive upsert of one attempt's variant deltas. Grouped by (lemma, surface), so again no
// conflict row is affected twice within the statement.
export async function upsertVariants(
  userId: string,
  learnLanguage: string,
  deltas: VariantDelta[],
  seenAt: Date
): Promise<void> {
  if (deltas.length === 0) return
  await db
    .insert(lexemeVariantStats)
    .values(
      deltas.map((d) => ({
        userId,
        learnLanguage,
        lemma: d.lemma,
        surface: d.surface,
        seenCount: d.seen,
        lastSeenAt: seenAt,
      }))
    )
    .onConflictDoUpdate({
      target: [
        lexemeVariantStats.userId,
        lexemeVariantStats.learnLanguage,
        lexemeVariantStats.lemma,
        lexemeVariantStats.surface,
      ],
      set: {
        seenCount: sql`${lexemeVariantStats.seenCount} + excluded.seen_count`,
        lastSeenAt: sql`greatest(${lexemeVariantStats.lastSeenAt}, excluded.last_seen_at)`,
      },
    })
}

export async function listLexemes(
  userId: string,
  learnLanguage: string,
  sort: LexemeSort
): Promise<LexemeStatsRow[]> {
  const orderBy =
    sort === 'alpha'
      ? [asc(lexemeStats.lemma)]
      : sort === 'incorrect'
        ? [desc(lexemeStats.incorrectCount), desc(lexemeStats.seenCount), asc(lexemeStats.lemma)]
        : [desc(lexemeStats.seenCount), asc(lexemeStats.lemma)]

  return db
    .select()
    .from(lexemeStats)
    .where(and(eq(lexemeStats.userId, userId), eq(lexemeStats.learnLanguage, learnLanguage)))
    .orderBy(...orderBy)
}

// Lemmas the user keeps getting wrong — the word-level review signal for the sentence picker (Epic
// 21). Prefiltered on a minimum lifetime miss count (the struggle-ratio cut happens in the pure
// `buildReviewSignal`), ordered hardest-first and capped so the caller pulls a bounded set.
export interface StrugglingLexemeRow {
  lemma: string
  correctCount: number
  incorrectCount: number
}

export async function listStrugglingLexemes(
  userId: string,
  learnLanguage: string,
  minIncorrect: number,
  limit: number
): Promise<StrugglingLexemeRow[]> {
  return db
    .select({
      lemma: lexemeStats.lemma,
      correctCount: lexemeStats.correctCount,
      incorrectCount: lexemeStats.incorrectCount,
    })
    .from(lexemeStats)
    .where(
      and(
        eq(lexemeStats.userId, userId),
        eq(lexemeStats.learnLanguage, learnLanguage),
        gte(lexemeStats.incorrectCount, minIncorrect)
      )
    )
    .orderBy(desc(lexemeStats.incorrectCount))
    .limit(limit)
}

export async function getLexeme(
  userId: string,
  learnLanguage: string,
  lemma: string
): Promise<LexemeStatsRow | null> {
  const rows = await db
    .select()
    .from(lexemeStats)
    .where(
      and(
        eq(lexemeStats.userId, userId),
        eq(lexemeStats.learnLanguage, learnLanguage),
        eq(lexemeStats.lemma, lemma)
      )
    )
    .limit(1)
  return rows[0] ?? null
}

export async function listVariants(
  userId: string,
  learnLanguage: string,
  lemma: string
): Promise<LexemeVariantStatsRow[]> {
  return db
    .select()
    .from(lexemeVariantStats)
    .where(
      and(
        eq(lexemeVariantStats.userId, userId),
        eq(lexemeVariantStats.learnLanguage, learnLanguage),
        eq(lexemeVariantStats.lemma, lemma)
      )
    )
    .orderBy(desc(lexemeVariantStats.seenCount), asc(lexemeVariantStats.surface))
}

export async function distinctLanguages(userId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ learnLanguage: lexemeStats.learnLanguage })
    .from(lexemeStats)
    .where(eq(lexemeStats.userId, userId))
    .orderBy(asc(lexemeStats.learnLanguage))
  return rows.map((r) => r.learnLanguage)
}

// Shared definition cache lookup, keyed by the (learn, guess, lemma) triple. Returns null on a
// miss so the caller knows to generate one.
export async function getDefinition(
  learnLanguage: string,
  guessLanguage: string,
  lemma: string
): Promise<LexemeDefinitionRow | null> {
  const rows = await db
    .select()
    .from(lexemeDefinitions)
    .where(
      and(
        eq(lexemeDefinitions.learnLanguage, learnLanguage),
        eq(lexemeDefinitions.guessLanguage, guessLanguage),
        eq(lexemeDefinitions.lemma, lemma)
      )
    )
    .limit(1)
  return rows[0] ?? null
}

// Persist a freshly generated definition. onConflictDoNothing makes it race-safe: if two users
// define the same word at once, the first write wins and the second is a harmless no-op.
export async function saveDefinition(
  learnLanguage: string,
  guessLanguage: string,
  lemma: string,
  definition: string
): Promise<void> {
  await db
    .insert(lexemeDefinitions)
    .values({ learnLanguage, guessLanguage, lemma, definition })
    .onConflictDoNothing({
      target: [
        lexemeDefinitions.learnLanguage,
        lexemeDefinitions.guessLanguage,
        lexemeDefinitions.lemma,
      ],
    })
}

// Wipe both grains for everyone — used by the one-off backfill so it can rebuild the Palabradex
// from `attempts` and stay re-runnable (otherwise a second run would double the counts).
export async function clearAll(): Promise<void> {
  await db.delete(lexemeVariantStats)
  await db.delete(lexemeStats)
}
