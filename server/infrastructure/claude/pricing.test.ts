import { describe, expect, it } from 'vitest'
import { costUsd, type TokenUsage } from './pricing'
import { SENTENCE_MODEL } from './anthropicClient'

const usage: TokenUsage = {
  inputTokens: 1_000_000,
  outputTokens: 1_000_000,
  cacheCreationInputTokens: 0,
  cacheReadInputTokens: 0,
}

describe('costUsd batch discount (Epic 22)', () => {
  it('bills Message Batch usage at exactly half the standard rate', () => {
    const standard = costUsd(SENTENCE_MODEL, usage)
    const batch = costUsd(SENTENCE_MODEL, usage, true)
    expect(batch).toBeCloseTo(standard * 0.5, 10)
  })

  it('defaults to the standard rate when no batch flag is passed', () => {
    expect(costUsd(SENTENCE_MODEL, usage, false)).toBe(costUsd(SENTENCE_MODEL, usage))
  })
})
