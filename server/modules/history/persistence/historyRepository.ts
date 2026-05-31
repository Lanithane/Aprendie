import { and, asc, desc, eq, sql, type SQL } from 'drizzle-orm'
import { db } from '../../../infrastructure/db/client'
import { attempts, type AttemptRow, type NewAttemptRow } from '../../../infrastructure/db/schema'

export interface PairFilter {
  learnLanguage: string
  guessLanguage: string
  locale: string
}

export type ListCursor =
  | { sort: 'newest'; createdAt: Date; id: string }
  | { sort: 'worst'; score: number; id: string }

export interface ListOptions {
  pair?: PairFilter
  level?: string
  sort?: 'newest' | 'worst'
  limit: number
  cursor?: ListCursor
}

export async function insert(row: NewAttemptRow): Promise<AttemptRow> {
  const inserted = await db.insert(attempts).values(row).returning()
  return inserted[0]
}

export async function listForUser(userId: string, opts: ListOptions): Promise<AttemptRow[]> {
  const conds: SQL[] = [eq(attempts.userId, userId)]
  if (opts.pair) {
    conds.push(
      eq(attempts.learnLanguage, opts.pair.learnLanguage),
      eq(attempts.guessLanguage, opts.pair.guessLanguage),
      eq(attempts.locale, opts.pair.locale)
    )
  }
  if (opts.level) {
    conds.push(eq(attempts.level, opts.level))
  }

  const sort = opts.sort ?? 'newest'

  if (opts.cursor) {
    const c = opts.cursor
    if (c.sort === 'newest') {
      conds.push(sql`(${attempts.createdAt}, ${attempts.id}) < (${c.createdAt}, ${c.id})`)
    } else {
      // Tuple comparison: next page continues where (score, id) left off ascending.
      conds.push(sql`(${attempts.score}, ${attempts.id}) > (${c.score}, ${c.id})`)
    }
  }

  return db
    .select()
    .from(attempts)
    .where(and(...conds))
    .orderBy(
      ...(sort === 'worst'
        ? [asc(attempts.score), asc(attempts.id)]
        : [desc(attempts.createdAt), desc(attempts.id)])
    )
    .limit(opts.limit)
}

export async function getByIdForUser(userId: string, id: string): Promise<AttemptRow | null> {
  const rows = await db
    .select()
    .from(attempts)
    .where(and(eq(attempts.id, id), eq(attempts.userId, userId)))
    .limit(1)
  return rows[0] ?? null
}

export async function distinctPairsForUser(
  userId: string
): Promise<Array<{ learnLanguage: string; guessLanguage: string; locale: string }>> {
  return db
    .selectDistinct({
      learnLanguage: attempts.learnLanguage,
      guessLanguage: attempts.guessLanguage,
      locale: attempts.locale,
    })
    .from(attempts)
    .where(eq(attempts.userId, userId))
}
