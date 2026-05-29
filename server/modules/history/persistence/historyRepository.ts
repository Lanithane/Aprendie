import { and, desc, eq, sql, type SQL } from 'drizzle-orm'
import { db } from '../../../infrastructure/db/client'
import { attempts, type AttemptRow, type NewAttemptRow } from '../../../infrastructure/db/schema'

export interface PairFilter {
  learnLanguage: string
  guessLanguage: string
  locale: string
}

export interface ListCursor {
  createdAt: Date
  id: string
}

export interface ListOptions {
  pair?: PairFilter
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
  // Keyset pagination over the (createdAt desc, id desc) ordering.
  if (opts.cursor) {
    conds.push(
      sql`(${attempts.createdAt}, ${attempts.id}) < (${opts.cursor.createdAt}, ${opts.cursor.id})`
    )
  }
  return db
    .select()
    .from(attempts)
    .where(and(...conds))
    .orderBy(desc(attempts.createdAt), desc(attempts.id))
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
