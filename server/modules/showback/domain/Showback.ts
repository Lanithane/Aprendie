import type { SustainabilityEstimate } from '../../../infrastructure/claude/sustainability'

// The billed operations we attribute spend to.
export type UsageOperation =
  | 'correction'
  | 'sentence_batch'
  | 'translation'
  | 'flashcard_grade'
  | 'flashcard_batch'
  | 'grammar'

export interface TokenTotals {
  input: number
  output: number
  cacheCreation: number
  cacheRead: number
  total: number
}

// A single account's cumulative usage showback: total dollar cost, a per-operation breakdown,
// raw token totals, and a clearly-labeled environmental estimate derived from those tokens.
// Informational only — every call runs on the operator key (per BLUEPRINT), so this is
// visibility into what was spent on the account's behalf, not a bill.
export interface ShowbackView {
  totalCostUsd: number
  byOperation: Record<UsageOperation, number>
  tokens: TokenTotals
  estimate: SustainabilityEstimate
}
