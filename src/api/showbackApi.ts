import { api } from './client'

export type UsageOperation = 'correction' | 'sentence_batch' | 'translation'

export interface SustainabilityEstimate {
  energyWh: number
  co2Grams: number
  waterMl: number
}

// Mirrors the server's `ShowbackView`. Cumulative spend for the signed-in account: total cost,
// per-operation breakdown, token totals, and a clearly-labeled environmental estimate.
export interface Showback {
  totalCostUsd: number
  byOperation: Record<UsageOperation, number>
  tokens: {
    input: number
    output: number
    cacheCreation: number
    cacheRead: number
    total: number
  }
  estimate: SustainabilityEstimate
}

export function fetchShowback(): Promise<Showback> {
  return api<Showback>('/api/showback/me')
}
