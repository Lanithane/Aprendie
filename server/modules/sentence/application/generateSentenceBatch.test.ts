import { describe, it, expect } from 'vitest'
import { buildSentenceMessageParams } from './generateSentenceBatch'

function userText(params: ReturnType<typeof buildSentenceMessageParams>): string {
  const content = params.messages[0]?.content
  return typeof content === 'string' ? content : ''
}

const base = { learnLanguage: 'es', guessLanguage: 'en', locale: 'es-ES', level: 'b1' } as const

describe('buildSentenceMessageParams theme line', () => {
  it('spreads a shuffled domain selection when no topic is pinned', () => {
    const text = userText(buildSentenceMessageParams(base, 10))
    expect(text).toContain('Spread the 10 sentences across these everyday domains')
    expect(text).not.toContain('on this everyday domain:')
  })

  it('forces the whole batch onto a pinned topic', () => {
    const text = userText(
      buildSentenceMessageParams({ ...base, category: 'sports and exercise' }, 10)
    )
    expect(text).toContain('Base all 10 sentences on this everyday domain: sports and exercise.')
    expect(text).not.toContain('Spread the')
  })

  it('phrases a single pinned sentence in the singular', () => {
    const text = userText(
      buildSentenceMessageParams({ ...base, category: 'food, cooking and eating out' }, 1)
    )
    expect(text).toContain(
      'Base this sentence on this everyday domain: food, cooking and eating out.'
    )
  })
})
