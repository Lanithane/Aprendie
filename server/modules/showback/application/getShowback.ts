import {
  estimateSustainability,
  type SustainabilityEstimate,
} from '../../../infrastructure/claude/sustainability'
import * as usageEventRepository from '../persistence/usageEventRepository'
import type { CostPoint, CostSeriesOptions } from '../persistence/usageEventRepository'
import type { ShowbackView, UsageOperation } from '../domain/Showback'

export type { CostPoint, CostSeriesOptions }

const EMPTY_BY_OPERATION: Record<UsageOperation, number> = {
  correction: 0,
  sentence_batch: 0,
  translation: 0,
  flashcard_grade: 0,
  flashcard_batch: 0,
  grammar: 0,
}

// Cumulative showback for one account: total cost, per-operation breakdown, token totals, and
// the labeled environmental estimate derived from those tokens.
export async function getUserShowback(userId: string): Promise<ShowbackView> {
  const aggregates = await usageEventRepository.aggregateByOperation(userId)

  const byOperation = { ...EMPTY_BY_OPERATION }
  let totalCostUsd = 0
  const tokens = { input: 0, output: 0, cacheCreation: 0, cacheRead: 0, total: 0 }

  for (const agg of aggregates) {
    byOperation[agg.operation] = agg.costUsd
    totalCostUsd += agg.costUsd
    tokens.input += agg.inputTokens
    tokens.output += agg.outputTokens
    tokens.cacheCreation += agg.cacheCreationInputTokens
    tokens.cacheRead += agg.cacheReadInputTokens
  }
  tokens.total = tokens.input + tokens.output + tokens.cacheCreation + tokens.cacheRead

  return {
    totalCostUsd,
    byOperation,
    tokens,
    estimate: estimateSustainability(tokens.total),
  }
}

// Total dollar cost per user, for the admin user list (folds into Epic 4's AdminUserView).
export async function getShowbackForAllUsers(): Promise<Map<string, number>> {
  return usageEventRepository.totalCostForAllUsers()
}

// Dollar cost per time bucket, for the metrics line graphs. Sitewide when `userId` is omitted.
export function getCostSeries(opts: CostSeriesOptions): Promise<CostPoint[]> {
  return usageEventRepository.costPerBucket(opts)
}

export interface SiteShowback {
  totalCostUsd: number
  totalTokens: number
  estimate: SustainabilityEstimate
}

// Lifetime sitewide spend + the labeled environmental estimate derived from total tokens.
export async function getSiteShowback(): Promise<SiteShowback> {
  const totals = await usageEventRepository.siteTotals()
  return {
    totalCostUsd: totals.totalCostUsd,
    totalTokens: totals.totalTokens,
    estimate: estimateSustainability(totals.totalTokens),
  }
}
