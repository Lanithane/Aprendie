import { and, eq, isNull, sql, type SQL } from 'drizzle-orm'
import { db } from '../../../infrastructure/db/client'
import {
  sentenceCache,
  type SentenceRow,
  type NewSentenceRow,
} from '../../../infrastructure/db/schema'
import type { SpanishLocale } from '../../../../shared/types'

interface PoolFilter {
  userId: string
  locale: SpanishLocale
  difficulty?: number
}

function poolFilters(filter: PoolFilter): SQL[] {
  const base: SQL[] = [
    eq(sentenceCache.userId, filter.userId),
    eq(sentenceCache.locale, filter.locale),
    isNull(sentenceCache.consumedAt),
  ]
  if (filter.difficulty !== undefined) {
    base.push(eq(sentenceCache.difficulty, filter.difficulty))
  }
  return base
}

export async function countUnconsumed(filter: PoolFilter): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(sentenceCache)
    .where(and(...poolFilters(filter)))
  return row?.count ?? 0
}

export async function takeNextUnconsumed(filter: PoolFilter): Promise<SentenceRow | null> {
  const candidates = await db
    .select()
    .from(sentenceCache)
    .where(and(...poolFilters(filter)))
    .orderBy(sentenceCache.createdAt)
    .limit(1)
  if (candidates.length === 0) return null
  const sentence = candidates[0]
  await db
    .update(sentenceCache)
    .set({ consumedAt: new Date() })
    .where(eq(sentenceCache.id, sentence.id))
  return sentence
}

export async function insertBatch(rows: NewSentenceRow[]): Promise<void> {
  if (rows.length === 0) return
  await db.insert(sentenceCache).values(rows)
}

export async function findForUser(
  userId: string,
  sentenceId: string
): Promise<SentenceRow | null> {
  const rows = await db
    .select()
    .from(sentenceCache)
    .where(and(eq(sentenceCache.id, sentenceId), eq(sentenceCache.userId, userId)))
    .limit(1)
  return rows[0] ?? null
}
