import { describe, it, expect } from 'vitest'
import { selectNext, unseenCount, type CorpusCandidate, type Exposure } from './selectSentence'

function cand(id: string, createdAtMs: number, theme: string | null = null): CorpusCandidate {
  return { id, createdAt: new Date(createdAtMs), theme }
}

function seen(sentenceId: string, lastSeenMs: number, seenCount = 1): Exposure {
  return { sentenceId, seenCount, lastSeenAt: new Date(lastSeenMs) }
}

describe('selectNext', () => {
  it('returns null for an empty corpus', () => {
    expect(selectNext([], [])).toBeNull()
  })

  it('prefers an unseen sentence over a seen one', () => {
    const candidates = [cand('a', 1000), cand('b', 2000)]
    // 'a' was already seen; 'b' is unseen and must win even though it is newer.
    expect(selectNext(candidates, [seen('a', 5000)])).toBe('b')
  })

  it('serves the oldest-inserted unseen sentence first', () => {
    const candidates = [cand('new', 3000), cand('old', 1000), cand('mid', 2000)]
    expect(selectNext(candidates, [])).toBe('old')
  })

  it('resurfaces the least-recently-seen sentence once all are seen', () => {
    const candidates = [cand('a', 1000), cand('b', 2000), cand('c', 3000)]
    const exposures = [seen('a', 9000), seen('b', 4000), seen('c', 7000)]
    // 'b' was seen longest ago.
    expect(selectNext(candidates, exposures)).toBe('b')
  })
})

describe('unseenCount', () => {
  it('counts only candidates with no exposure', () => {
    const candidates = [cand('a', 1), cand('b', 2), cand('c', 3)]
    expect(unseenCount(candidates, [seen('a', 10)])).toBe(2)
    expect(unseenCount(candidates, [])).toBe(3)
    expect(unseenCount([], [])).toBe(0)
  })
})
