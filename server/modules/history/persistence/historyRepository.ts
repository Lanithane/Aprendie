import { and, asc, desc, eq, gte, sql, type SQL } from 'drizzle-orm'
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

// --- Metrics aggregates (backs the metrics module) -----------------------------------------

export type Bucket = 'day' | 'hour'

export interface SeriesPoint {
  bucket: string
  value: number
}

export interface SeriesOptions {
  userId?: string
  since?: Date
  bucket: Bucket
}

// A UTC-truncated, pre-formatted time bucket. Formatting to a string in SQL (rather than
// returning a Date) sidesteps node-postgres' local-time parsing of `timestamp` values, so the
// bucket key is unambiguous on the wire and the client can parse it back as UTC.
function bucketExpr(b: Bucket): SQL<string> {
  const fmt = b === 'hour' ? 'YYYY-MM-DD"T"HH24:00' : 'YYYY-MM-DD'
  return sql<string>`to_char(date_trunc(${b}, ${attempts.createdAt} AT TIME ZONE 'UTC'), ${fmt})`
}

// Attempt counts per time bucket, oldest first. Sitewide when `userId` is omitted.
export async function attemptsPerBucket(opts: SeriesOptions): Promise<SeriesPoint[]> {
  const conds: SQL[] = []
  if (opts.userId) conds.push(eq(attempts.userId, opts.userId))
  if (opts.since) conds.push(gte(attempts.createdAt, opts.since))
  const b = bucketExpr(opts.bucket)
  return (
    db
      .select({ bucket: b, value: sql<number>`count(*)::int` })
      .from(attempts)
      .where(conds.length ? and(...conds) : undefined)
      // Group/order by the bucket's output position: repeating the parametrized expression here
      // would make Postgres treat the two as distinct bind params and reject the ungrouped column.
      .groupBy(sql`1`)
      .orderBy(sql`1`)
  )
}

// Distinct active users (anyone with an attempt) per time bucket, oldest first.
export async function activeUsersPerBucket(
  opts: Omit<SeriesOptions, 'userId'>
): Promise<SeriesPoint[]> {
  const conds: SQL[] = []
  if (opts.since) conds.push(gte(attempts.createdAt, opts.since))
  const b = bucketExpr(opts.bucket)
  return (
    db
      .select({ bucket: b, value: sql<number>`count(distinct ${attempts.userId})::int` })
      .from(attempts)
      .where(conds.length ? and(...conds) : undefined)
      // Group/order by the bucket's output position: repeating the parametrized expression here
      // would make Postgres treat the two as distinct bind params and reject the ungrouped column.
      .groupBy(sql`1`)
      .orderBy(sql`1`)
  )
}

export interface AttemptStats {
  total: number
  distinctUsers: number
  correct: number
}

// Lifetime sitewide attempt totals (count, distinct users, correct) for the metrics headline.
export async function siteAttemptStats(): Promise<AttemptStats> {
  const rows = await db
    .select({
      total: sql<number>`count(*)::int`,
      distinctUsers: sql<number>`count(distinct ${attempts.userId})::int`,
      correct: sql<number>`coalesce(sum(case when ${attempts.isCorrect} then 1 else 0 end), 0)::int`,
    })
    .from(attempts)
  return rows[0] ?? { total: 0, distinctUsers: 0, correct: 0 }
}

export interface UserAttemptStats {
  total: number
  correct: number
  today: number
}

// Lifetime + today attempt totals for one user. `today` is bounded by the UTC calendar day,
// matching the daily-cap boundary used elsewhere (see usage/persistence/usageRepository.utcDay).
export async function userAttemptStats(userId: string): Promise<UserAttemptStats> {
  const sinceMidnight = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`)
  const rows = await db
    .select({
      total: sql<number>`count(*)::int`,
      correct: sql<number>`coalesce(sum(case when ${attempts.isCorrect} then 1 else 0 end), 0)::int`,
      today: sql<number>`coalesce(sum(case when ${attempts.createdAt} >= ${sinceMidnight} then 1 else 0 end), 0)::int`,
    })
    .from(attempts)
    .where(eq(attempts.userId, userId))
  return rows[0] ?? { total: 0, correct: 0, today: 0 }
}
