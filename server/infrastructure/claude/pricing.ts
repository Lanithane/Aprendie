import { CORRECTION_MODEL, SENTENCE_MODEL } from './anthropicClient'

// Flat, non-nullable view of the Anthropic usage block. The SDK returns the two cache
// fields as `number | null`; we coerce nulls to 0 here so every downstream consumer
// (cost math, showback aggregation, the DB columns) deals in plain numbers.
export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  cacheCreationInputTokens: number
  cacheReadInputTokens: number
}

// The shape we read off `resp.usage` — only the fields we price. Kept structural so we
// don't couple to the SDK's exact type across versions.
interface RawUsage {
  input_tokens?: number | null
  output_tokens?: number | null
  cache_creation_input_tokens?: number | null
  cache_read_input_tokens?: number | null
}

export function toTokenUsage(usage: RawUsage | null | undefined): TokenUsage {
  return {
    inputTokens: usage?.input_tokens ?? 0,
    outputTokens: usage?.output_tokens ?? 0,
    cacheCreationInputTokens: usage?.cache_creation_input_tokens ?? 0,
    cacheReadInputTokens: usage?.cache_read_input_tokens ?? 0,
  }
}

// USD per million tokens, per model. These are a SNAPSHOT of published Anthropic list
// prices as of Epic 6 (2026-05) — `recordUsage` writes the computed dollar cost into
// `usage_events.cost_usd` at event time precisely because these drift. Editing them here
// only changes the cost of *future* events; historical rows keep their snapshotted cost.
interface ModelRates {
  inputPerMTok: number
  outputPerMTok: number
  cacheWritePerMTok: number
  cacheReadPerMTok: number
}

const RATES: Record<string, ModelRates> = {
  // Claude Sonnet 4.6 (corrections).
  [CORRECTION_MODEL]: {
    inputPerMTok: 3,
    outputPerMTok: 15,
    cacheWritePerMTok: 3.75,
    cacheReadPerMTok: 0.3,
  },
  // Claude Haiku 4.5 (sentence batches).
  [SENTENCE_MODEL]: {
    inputPerMTok: 1,
    outputPerMTok: 5,
    cacheWritePerMTok: 1.25,
    cacheReadPerMTok: 0.1,
  },
}

// Fallback when we somehow record usage for an unknown model — price it as Sonnet (the
// pricier of the two) so showback never *under*-reports, and log so it gets noticed.
function ratesFor(model: string): ModelRates {
  const rates = RATES[model]
  if (rates) return rates
  console.warn(`[pricing] no rate card for model "${model}"; defaulting to correction rates`)
  return RATES[CORRECTION_MODEL]
}

// Dollar cost of a single call. Cache reads are far cheaper than fresh input, and cache
// writes a touch dearer, so each token class is priced on its own line.
export function costUsd(model: string, usage: TokenUsage): number {
  const r = ratesFor(model)
  const dollars =
    (usage.inputTokens * r.inputPerMTok +
      usage.outputTokens * r.outputPerMTok +
      usage.cacheCreationInputTokens * r.cacheWritePerMTok +
      usage.cacheReadInputTokens * r.cacheReadPerMTok) /
    1_000_000
  return dollars
}
