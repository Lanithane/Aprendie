import { costUsd, type TokenUsage } from '../../../infrastructure/claude/pricing'
import * as usageEventRepository from '../persistence/usageEventRepository'
import type { UsageOperation } from '../domain/Showback'

interface RecordUsageInput {
  userId: string
  operation: UsageOperation
  model: string
  usage: TokenUsage
  // True when the usage came from a half-price Message Batch fill (Epic 22), so `cost_usd` is
  // snapshotted at the batch rate. The token counts are stored as-is; only the dollar cost differs.
  batch?: boolean
}

// Computes the dollar cost from the rate card and snapshots one usage event. Cross-module
// callers (correction, sentence) invoke this off the critical path and wrap it in try/catch:
// a showback write must never fail a graded attempt or a sentence batch. `cost_usd` is a
// `numeric(12,6)` column, so we hand it a fixed-precision string.
export async function recordUsage(input: RecordUsageInput): Promise<void> {
  const cost = costUsd(input.model, input.usage, input.batch ?? false)
  await usageEventRepository.insertEvent({
    userId: input.userId,
    operation: input.operation,
    model: input.model,
    inputTokens: input.usage.inputTokens,
    outputTokens: input.usage.outputTokens,
    cacheCreationInputTokens: input.usage.cacheCreationInputTokens,
    cacheReadInputTokens: input.usage.cacheReadInputTokens,
    costUsd: cost.toFixed(6),
  })
}
