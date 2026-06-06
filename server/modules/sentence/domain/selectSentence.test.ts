import { describe, it, expect } from 'vitest'
import {
  selectNext,
  unseenCount,
  buildReviewSignal,
  lemmasOf,
  DEFAULT_WEIGHTS,
  type CorpusCandidate,
  type Exposure,
  type ReviewSignal,
  type AttemptSignal,
  type LexemeSignal,
} from './selectSentence'

function cand(
  id: string,
  createdAtMs: number,
  theme: string | null = null,
  lemmas: string[] = []
): CorpusCandidate {
  return { id, createdAt: new Date(createdAtMs), theme, lemmas }
}

function seen(sentenceId: string, lastSeenMs: number, seenCount = 1): Exposure {
  return { sentenceId, seenCount, lastSeenAt: new Date(lastSeenMs) }
}

function signal(opts: {
  mistakeSentenceIds?: string[]
  strugglingThemes?: Record<string, number>
  strugglingLexemes?: Record<string, number>
}): ReviewSignal {
  return {
    mistakeSentenceIds: new Set(opts.mistakeSentenceIds ?? []),
    strugglingThemes: new Map(Object.entries(opts.strugglingThemes ?? {})),
    strugglingLexemes: new Map(Object.entries(opts.strugglingLexemes ?? {})),
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
    expect(selectNext(candidates, exposures, signal({ mistakeSentenceIds: ['a'] }))).toBe('a')
  })

  it('resurfaces a same-category sentence from a struggling theme', () => {
    const candidates = [cand('food', 8000, 'food'), cand('travel', 2000, 'travel')]
    // 'travel' was seen longest ago, so LRU would pick it — but the user struggles with 'food'.
    const exposures = [seen('food', 8000), seen('travel', 2000)]
    expect(selectNext(candidates, exposures, signal({ strugglingThemes: { food: 1 } }))).toBe(
      'food'
    )
  })

  it('resurfaces a sentence containing a word the user keeps missing', () => {
    // 'b' was seen longest ago (LRU would pick it), but 'a' contains 'comer', a struggling lemma.
    const candidates = [cand('a', 1000, null, ['yo', 'comer']), cand('b', 2000, null, ['tú', 'ir'])]
    const exposures = [seen('a', 8000), seen('b', 2000)]
    expect(selectNext(candidates, exposures, signal({ strugglingLexemes: { comer: 0.8 } }))).toBe(
      'a'
    )
  })

  it('keeps draining scarce unseen material over a freshly-missed sentence alone', () => {
    // One unseen sentence and one seen sentence the user just got wrong. A miss still matters, but
    // by itself it no longer clears the unseen baseline, so the fresh sentence wins.
    const candidates = [cand('fresh', 5000), cand('missed', 1000)]
    const exposures = [seen('missed', 3000)]
    expect(selectNext(candidates, exposures, signal({ mistakeSentenceIds: ['missed'] }))).toBe(
      'fresh'
    )
  })

  it('resurfaces a missed sentence ahead of scarce unseen material when review signals combine', () => {
    // A missed sentence that is also least-recently-seen carries enough signal to preempt the last
    // few unseen prompts.
    const candidates = [cand('fresh', 5000), cand('missed', 1000), cand('recent', 2000)]
    const exposures = [seen('missed', 1000), seen('recent', 3000)]
    expect(selectNext(candidates, exposures, signal({ mistakeSentenceIds: ['missed'] }))).toBe(
      'missed'
    )
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
    expect(selectNext(candidates, exposures, signal({ mistakeSentenceIds: ['s'] }))).toBe('u2')
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

  function lex(lemma: string, correctCount: number, incorrectCount: number): LexemeSignal {
    return { lemma, correctCount, incorrectCount }
  }

  it('collects sentence ids from wrong attempts only', () => {
    const sig = buildReviewSignal({
      attempts: [
        attempt('a', false),
        attempt('b', true),
        attempt('c', false),
        attempt(null, false), // no sentence id → skipped
      ],
    })
    expect([...sig.mistakeSentenceIds].sort()).toEqual(['a', 'c'])
  })

  it('marks a theme as struggling once misses cross the threshold, weighted by wrong-share', () => {
    const sig = buildReviewSignal({
      attempts: [
        attempt('a', false, 'food'),
        attempt('b', false, 'food'),
        attempt('c', true, 'food'),
        attempt('d', false, 'travel'), // single miss → below default threshold
      ],
    })
    expect(sig.strugglingThemes.get('food')).toBeCloseTo(2 / 3)
    expect(sig.strugglingThemes.has('travel')).toBe(false)
  })

  it('marks a lemma as struggling once lifetime misses cross the threshold, weighted by error rate', () => {
    const sig = buildReviewSignal({
      attempts: [],
      lexemes: [
        lex('comer', 2, 3), // 3 misses ≥ threshold → error rate 3/5
        lex('ir', 9, 1), // single miss → below default threshold
      ],
    })
    expect(sig.strugglingLexemes.get('comer')).toBeCloseTo(3 / 5)
    expect(sig.strugglingLexemes.has('ir')).toBe(false)
  })

  it('normalizes struggling lemmas so they match a sentence breakdown', () => {
    const sig = buildReviewSignal({ attempts: [], lexemes: [lex('Comér', 0, 2)] })
    expect(sig.strugglingLexemes.has('comér')).toBe(true)
  })

  it('respects custom thresholds', () => {
    const sig = buildReviewSignal(
      { attempts: [attempt('a', false, 'food')], lexemes: [lex('ir', 0, 1)] },
      { minThemeMisses: 1, minLexemeMisses: 1 }
    )
    expect(sig.strugglingThemes.get('food')).toBe(1)
    expect(sig.strugglingLexemes.get('ir')).toBe(1)
  })

  it('returns empty sets for no inputs', () => {
    const sig = buildReviewSignal({ attempts: [] })
    expect(sig.mistakeSentenceIds.size).toBe(0)
    expect(sig.strugglingThemes.size).toBe(0)
    expect(sig.strugglingLexemes.size).toBe(0)
  })
})

describe('lemmasOf', () => {
  it('extracts unique normalized lemmas from a word breakdown', () => {
    const breakdown = [
      { surface: 'Como', lemma: 'Comer', partOfSpeech: 'verb', modifiers: [] },
      { surface: 'pan', lemma: 'pan', partOfSpeech: 'noun', modifiers: [] },
      { surface: 'comiendo', lemma: ' comer ', partOfSpeech: 'verb', modifiers: [] }, // dup once normalized
    ]
    expect(lemmasOf(breakdown).sort()).toEqual(['comer', 'pan'])
  })

  it('returns an empty array for null/empty breakdowns', () => {
    expect(lemmasOf(null)).toEqual([])
    expect(lemmasOf(undefined)).toEqual([])
    expect(lemmasOf([])).toEqual([])
  })
})

describe('DEFAULT_WEIGHTS', () => {
  it('keeps the unseen baseline above individual weak signals but below combined review signals', () => {
    // Invariant the sliding scale relies on: a merely-old or freshly-missed seen sentence does not
    // preempt fresh material, but an old missed sentence can.
    expect(DEFAULT_WEIGHTS.recency).toBeLessThan(DEFAULT_WEIGHTS.unseenBase)
    expect(DEFAULT_WEIGHTS.mistake).toBeLessThan(DEFAULT_WEIGHTS.unseenBase)
    expect(DEFAULT_WEIGHTS.mistake + DEFAULT_WEIGHTS.recency).toBeGreaterThan(
      DEFAULT_WEIGHTS.unseenBase
    )
  })
})
