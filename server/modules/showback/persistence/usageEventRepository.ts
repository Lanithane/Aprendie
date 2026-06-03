import { and, eq, gte, sql, type SQL } from 'drizzle-orm'
import { db } from '../../../infrastructure/db/client'
import { usageEvents, type NewUsageEventRow } from '../../../infrastructure/db/schema'
import type { UsageOperation } from '../domain/Showback'

export async function insertEvent(row: NewUsageEventRow): Promise<void> {
  await db.insert(usageEvents).values(row)
}

// One aggregate row per operation for a user: summed dollar cost and token counts. Absent
// operations simply don't appear (the caller defaults them to 0). `cost_usd` is `numeric`, so
// pg hands its SUM back as a string — parsed to a number here at the persistence boundary.
export interface OperationAggregate {
  operation: UsageOperation
  costUsd: number
  inputTokens: number
  outputTokens: number
  cacheCreationInputTokens: number
  cacheReadInputTokens: number
}

export async function aggregateByOperation(userId: string): Promise<OperationAggregate[]> {
  const rows = await db
    .select({
      operation: usageEvents.operation,
      costUsd: sql<string>`coalesce(sum(${usageEvents.costUsd}), 0)`,
      inputTokens: sql<string>`coalesce(sum(${usageEvents.inputTokens}), 0)`,
      outputTokens: sql<string>`coalesce(sum(${usageEvents.outputTokens}), 0)`,
      cacheCreationInputTokens: sql<string>`coalesce(sum(${usageEvents.cacheCreationInputTokens}), 0)`,
      cacheReadInputTokens: sql<string>`coalesce(sum(${usageEvents.cacheReadInputTokens}), 0)`,
    })
    .from(usageEvents)
    .where(eq(usageEvents.userId, userId))
    .groupBy(usageEvents.operation)
  return rows.map((r) => ({
    operation: r.operation,
    costUsd: Number(r.costUsd),
    inputTokens: Number(r.inputTokens),
    outputTokens: Number(r.outputTokens),
    cacheCreationInputTokens: Number(r.cacheCreationInputTokens),
    cacheReadInputTokens: Number(r.cacheReadInputTokens),
  }))
}

// Total dollar cost per user across all operations, keyed by user id. Users with no events are
// absent (callers default them to 0). Backs the admin per-user totals without an N+1.
export async function totalCostForAllUsers(): Promise<Map<string, number>> {
  const rows = await db
    .select({
      userId: usageEvents.userId,
      costUsd: sql<string>`coalesce(sum(${usageEvents.costUsd}), 0)`,
    })
    .from(usageEvents)
    .groupBy(usageEvents.userId)
  return new Map(rows.map((r) => [r.userId, Number(r.costUsd)]))
}

// --- Metrics aggregates (backs the metrics module) -----------------------------------------

export type Bucket = 'day' | 'hour'

export interface CostPoint {
  bucket: string
  costUsd: number
}

export interface CostSeriesOptions {
  userId?: string
  since?: Date
  bucket: Bucket
}

// UTC-truncated, pre-formatted bucket key (string in SQL to avoid local-time Date parsing).
function bucketExpr(b: Bucket): SQL<string> {
  const fmt = b === 'hour' ? 'YYYY-MM-DD"T"HH24:00' : 'YYYY-MM-DD'
  return sql<string>`to_char(date_trunc(${b}, ${usageEvents.createdAt} AT TIME ZONE 'UTC'), ${fmt})`
}

// Summed dollar cost per time bucket, oldest first. Sitewide when `userId` is omitted.
export async function costPerBucket(opts: CostSeriesOptions): Promise<CostPoint[]> {
  const conds: SQL[] = []
  if (opts.userId) conds.push(eq(usageEvents.userId, opts.userId))
  if (opts.since) conds.push(gte(usageEvents.createdAt, opts.since))
  const b = bucketExpr(opts.bucket)
  const rows = await db
    .select({ bucket: b, costUsd: sql<string>`coalesce(sum(${usageEvents.costUsd}), 0)` })
    .from(usageEvents)
    .where(conds.length ? and(...conds) : undefined)
    // Group/order by the bucket's output position (see historyRepository.attemptsPerBucket).
    .groupBy(sql`1`)
    .orderBy(sql`1`)
  return rows.map((r) => ({ bucket: r.bucket, costUsd: Number(r.costUsd) }))
}

export interface UsageTotals {
  totalCostUsd: number
  totalTokens: number
}

// Lifetime sitewide totals: summed cost and all token classes (the latter feeds the
// sustainability estimate for the metrics headline).
export async function siteTotals(): Promise<UsageTotals> {
  const rows = await db
    .select({
      cost: sql<string>`coalesce(sum(${usageEvents.costUsd}), 0)`,
      tokens: sql<string>`coalesce(sum(${usageEvents.inputTokens} + ${usageEvents.outputTokens} + ${usageEvents.cacheCreationInputTokens} + ${usageEvents.cacheReadInputTokens}), 0)`,
    })
    .from(usageEvents)
  const r = rows[0]
  return { totalCostUsd: Number(r?.cost ?? 0), totalTokens: Number(r?.tokens ?? 0) }
}
