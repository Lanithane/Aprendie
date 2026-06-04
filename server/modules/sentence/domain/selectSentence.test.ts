import { describe, it, expect } from 'vitest'
import {
  selectNext,
  unseenCount,
  buildReviewSignal,
  DEFAULT_WEIGHTS,
  type CorpusCandidate,
  type Exposure,
  type ReviewSignal,
  type AttemptSignal,
} from './selectSentence'

function cand(id: string, createdAtMs: number, theme: string | null = null): CorpusCandidate {
  return { id, createdAt: new Date(createdAtMs), theme }
}

function seen(sentenceId: string, lastSeenMs: number, seenCount = 1): Exposure {
  return { sentenceId, seenCount, lastSeenAt: new Date(lastSeenMs) }
}

function signal(
  mistakeSentenceIds: string[] = [],
  strugglingThemes: Record<string, number> = {}
): ReviewSignal {
  return {
    mistakeSentenceIds: new Set(mistakeSentenceIds),
    strugglingThemes: new Map(Object.entries(strugglingThemes)),
  }
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

  it('serves the oldest-inserted unseen sentence first (drain mode)', () => {
    const candidates = [cand('new', 3000), cand('old', 1000), cand('mid', 2000)]
    expect(selectNext(candidates, [])).toBe('old')
  })

  it('resurfaces the least-recently-seen sentence once all are seen (LRU floor)', () => {
    const candidates = [cand('a', 1000), cand('b', 2000), cand('c', 3000)]
    const exposures = [seen('a', 9000), seen('b', 4000), seen('c', 7000)]
    // 'b' was seen longest ago and there's no review signal, so LRU wins.
    expect(selectNext(candidates, exposures)).toBe('b')
  })

  it('resurfaces a recently-missed sentence even if it was seen most recently', () => {
    const candidates = [cand('a', 1000), cand('b', 2000), cand('c', 3000)]
    // 'a' was seen most recently (LRU would pick 'b'), but the user just got 'a' wrong.
    const exposures = [seen('a', 9000), seen('b', 1000), seen('c', 5000)]
    expect(selectNext(candidates, exposures, signal(['a']))).toBe('a')
  })

  it('resurfaces a same-category sentence from a struggling theme', () => {
    const candidates = [cand('food', 8000, 'food'), cand('travel', 2000, 'travel')]
    // 'travel' was seen longest ago, so LRU would pick it — but the user struggles with 'food'.
    const exposures = [seen('food', 8000), seen('travel', 2000)]
    expect(selectNext(candidates, exposures, signal([], { food: 1 }))).toBe('food')
  })

  it('resurfaces a strong review candidate ahead of scarce unseen material', () => {
    // One unseen sentence and one seen sentence the user just got wrong; the mistake outranks the
    // flat unseen baseline, so review preempts the fresh sentence.
    const candidates = [cand('fresh', 5000), cand('missed', 1000)]
    const exposures = [seen('missed', 3000)]
    expect(selectNext(candidates, exposures, signal(['missed']))).toBe('missed')
  })

  it('keeps draining unseen when scarce but no review signal is strong enough', () => {
    // Same scarce-unseen shape, but the seen sentence carries no mistake/category signal, so its
    // recency score alone can't clear the unseen baseline — serve the fresh sentence.
    const candidates = [cand('fresh', 5000), cand('old', 1000)]
    const exposures = [seen('old', 3000)]
    expect(selectNext(candidates, exposures)).toBe('fresh')
  })

  it('stays in drain mode while plenty of unseen remain, ignoring the review signal', () => {
    const candidates = [cand('u1', 3000), cand('u2', 1000), cand('u3', 2000), cand('s', 500)]
    const exposures = [seen('s', 9000)]
    // 3 unseen ≥ reviewWhenUnseenBelow (3): serve oldest unseen even though 's' was missed.
    expect(selectNext(candidates, exposures, signal(['s']))).toBe('u2')
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

describe('buildReviewSignal', () => {
  function attempt(
    sentenceId: string | null,
    isCorrect: boolean,
    theme: string | null = null
  ): AttemptSignal {
    return { sentenceId, isCorrect, theme }
  }

  it('collects sentence ids from wrong attempts only', () => {
    const sig = buildReviewSignal([
      attempt('a', false),
      attempt('b', true),
      attempt('c', false),
      attempt(null, false), // no sentence id → skipped
    ])
    expect([...sig.mistakeSentenceIds].sort()).toEqual(['a', 'c'])
  })

  it('marks a theme as struggling once misses cross the threshold, weighted by wrong-share', () => {
    const sig = buildReviewSignal([
      attempt('a', false, 'food'),
      attempt('b', false, 'food'),
      attempt('c', true, 'food'),
      attempt('d', false, 'travel'), // single miss → below default threshold
    ])
    expect(sig.strugglingThemes.get('food')).toBeCloseTo(2 / 3)
    expect(sig.strugglingThemes.has('travel')).toBe(false)
  })

  it('respects a custom minThemeMisses', () => {
    const sig = buildReviewSignal([attempt('a', false, 'food')], { minThemeMisses: 1 })
    expect(sig.strugglingThemes.get('food')).toBe(1)
  })

  it('returns empty sets for no attempts', () => {
    const sig = buildReviewSignal([])
    expect(sig.mistakeSentenceIds.size).toBe(0)
    expect(sig.strugglingThemes.size).toBe(0)
  })
})

describe('DEFAULT_WEIGHTS', () => {
  it('keeps the unseen baseline above a pure-recency resurface but below a mistake', () => {
    // Invariant the sliding scale relies on: a merely-old seen sentence (recency ≤ 1) never preempts
    // fresh material, but a recent miss (mistake weight) does.
    expect(DEFAULT_WEIGHTS.recency).toBeLessThan(DEFAULT_WEIGHTS.unseenBase)
    expect(DEFAULT_WEIGHTS.mistake).toBeGreaterThan(DEFAULT_WEIGHTS.unseenBase)
  })
})
