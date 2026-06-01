import { eq, sql } from 'drizzle-orm'
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
