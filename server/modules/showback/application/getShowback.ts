import { estimateSustainability } from '../../../infrastructure/claude/sustainability'
import * as usageEventRepository from '../persistence/usageEventRepository'
import type { ShowbackView, UsageOperation } from '../domain/Showback'

const EMPTY_BY_OPERATION: Record<UsageOperation, number> = {
  correction: 0,
  sentence_batch: 0,
  translation: 0,
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
