import { describe, it, expect } from 'vitest'
import {
  selectNext,
  unseenCount,
  buildReviewSignal,
  lemmasOf,
  DEFAULT_WEIGHTS,
  RESURFACE_BELOW_SCORE,
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
    // cooldownWindow=3, effectiveCooldown=min(3,2)=2 → excludes 'a'(9000) and 'c'(7000)
    // eligible = ['b']; 'b' was seen longest ago among eligible → LRU wins.
    expect(selectNext(candidates, exposures)).toBe('b')
  })

  it('cooldown: missed sentence in cooldown is not served immediately; eligible seen wins', () => {
    // 'a' was seen most recently (in cooldown); only 'b' is eligible.
    const candidates = [cand('a', 1000), cand('b', 2000), cand('c', 3000)]
    const exposures = [seen('a', 9000), seen('b', 1000), seen('c', 5000)]
    expect(selectNext(candidates, exposures, signal({ mistakeSentenceIds: ['a'] }))).toBe('b')
  })

  it('cooldown: relaxes when the corpus has only one sentence', () => {
    const candidates = [cand('a', 1000)]
    const exposures = [seen('a', 5000)]
    // No alternative; effectiveCooldown=min(3,0)=0; 'a' is served.
    expect(selectNext(candidates, exposures)).toBe('a')
  })

  it('cooldown: resurfaces a missed sentence after it exits the cooldown window', () => {
    // s1/s2/s3 fill the cooldown window; 'missed' and 'other' are both eligible.
    // 'other' was seen more recently than 'missed', giving 'missed' recency=1.
    // recency(1) + mistake(1.5) = 2.5 > unseenBase(2) → 'missed' resurfaces over 'fresh'.
    const candidates = [
      cand('fresh', 7000),
      cand('missed', 1000),
      cand('other', 1500),
      cand('s1', 2000),
      cand('s2', 3000),
      cand('s3', 4000),
    ]
    const exposures = [
      seen('missed', 100),
      seen('other', 200),
      seen('s1', 600),
      seen('s2', 700),
      seen('s3', 800),
    ]
    // effectiveCooldown=min(3,5)=3; recentlyServed={s3,s2,s1}; eligible=[fresh, missed, other]
    // unseen=[fresh] (1 < reviewWhenUnseenBelow=3 → review mode)
    // among eligible seen: missed(100), other(200) — missed is oldest → recency=1
    // missed: score = 1*1 + 1.5*1 = 2.5 > unseenBase=2 → resurfaces
    expect(selectNext(candidates, exposures, signal({ mistakeSentenceIds: ['missed'] }))).toBe(
      'missed'
    )
  })

  it('resurfaces a same-category sentence from a struggling theme after the cooldown window', () => {
    // s1/s2/s3 fill the cooldown; only 'food' and 'travel' are eligible.
    const candidates = [
      cand('food', 8000, 'food'),
      cand('travel', 2000, 'travel'),
      cand('s1', 3000, 'other'),
      cand('s2', 4000, 'other'),
    ]
    const exposures = [seen('food', 1000), seen('travel', 2000), seen('s1', 6000), seen('s2', 7000)]
    // effectiveCooldown=min(3,3)=3; recentlyServed={s2,s1,travel}; eligible=[food]
    // 'food' is only eligible seen and user struggles with 'food' theme → food wins.
    expect(selectNext(candidates, exposures, signal({ strugglingThemes: { food: 1 } }))).toBe(
      'food'
    )
  })

  it('resurfaces a sentence containing a struggling lemma after the cooldown window', () => {
    // s1/s2 fill the cooldown; only 'a' is eligible.
    const candidates = [
      cand('a', 1000, null, ['yo', 'comer']),
      cand('b', 2000, null, ['tú', 'ir']),
      cand('s1', 3000),
      cand('s2', 4000),
    ]
    const exposures = [seen('a', 1000), seen('b', 2000), seen('s1', 5000), seen('s2', 6000)]
    // effectiveCooldown=min(3,3)=3; recentlyServed={s2,s1,b}; eligible=[a]
    // 'a' contains 'comer', a struggling lexeme → wins.
    expect(selectNext(candidates, exposures, signal({ strugglingLexemes: { comer: 0.8 } }))).toBe(
      'a'
    )
  })

  it('keeps draining scarce unseen material over a freshly-missed sentence alone', () => {
    // One unseen sentence and one seen sentence the user just got wrong. A miss still matters, but
    // by itself it no longer clears the unseen baseline, so the fresh sentence wins.
    const candidates = [cand('fresh', 5000), cand('missed', 1000)]
    const exposures = [seen('missed', 3000)]
    // effectiveCooldown=1; recentlyServed={missed}; eligible=[fresh] → fresh is served.
    expect(selectNext(candidates, exposures, signal({ mistakeSentenceIds: ['missed'] }))).toBe(
      'fresh'
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
    // effectiveCooldown=min(3,3)=3; recentlyServed={s}; eligible=[u1,u2,u3]
    // 3 unseen ≥ reviewWhenUnseenBelow(3): drain mode → serve oldest unseen.
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
    score: number,
    theme: string | null = null
  ): AttemptSignal {
    return { sentenceId, score, theme }
  }

  function lex(lemma: string, correctCount: number, incorrectCount: number): LexemeSignal {
    return { lemma, correctCount, incorrectCount }
  }

  it('counts only low-scoring attempts (below threshold) as misses', () => {
    const sig = buildReviewSignal({
      attempts: [
        attempt('a', 40), // miss
        attempt('b', 80), // not a miss (B grade)
        attempt('c', 30), // miss
        attempt(null, 20), // no sentence id → skipped
      ],
    })
    expect([...sig.mistakeSentenceIds].sort()).toEqual(['a', 'c'])
  })

  it('a score at the threshold is not a miss; one below is', () => {
    const sig = buildReviewSignal({
      attempts: [
        attempt('at', RESURFACE_BELOW_SCORE), // exactly at boundary → not a miss
        attempt('below', RESURFACE_BELOW_SCORE - 1), // just below → miss
      ],
    })
    expect(sig.mistakeSentenceIds.has('at')).toBe(false)
    expect(sig.mistakeSentenceIds.has('below')).toBe(true)
  })

  it('uses only the most recent attempt per sentence for mistake membership', () => {
    // Attempts arrive most-recent-first. 'a' was last attempted well (score=80), old attempt was bad.
    const sig = buildReviewSignal({
      attempts: [
        attempt('a', 80), // most recent → good, clears 'a' from drill set
        attempt('a', 20), // older → ignored once 'a' is decided
      ],
    })
    expect(sig.mistakeSentenceIds.has('a')).toBe(false)
  })

  it('oldest attempt wins when most recent was bad', () => {
    // 'a' most recent attempt is bad → should be in drill set
    const sig = buildReviewSignal({
      attempts: [
        attempt('a', 20), // most recent → bad
        attempt('a', 90), // older → ignored
      ],
    })
    expect(sig.mistakeSentenceIds.has('a')).toBe(true)
  })

  it('marks a theme as struggling once misses cross the threshold, weighted by wrong-share', () => {
    const sig = buildReviewSignal({
      attempts: [
        attempt('a', 30, 'food'),
        attempt('b', 40, 'food'),
        attempt('c', 80, 'food'),
        attempt('d', 30, 'travel'), // single miss → below default threshold
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
      { attempts: [attempt('a', 40, 'food')], lexemes: [lex('ir', 0, 1)] },
      { minThemeMisses: 1, minLexemeMisses: 1 }
    )
    expect(sig.strugglingThemes.get('food')).toBe(1)
    expect(sig.strugglingLexemes.get('ir')).toBe(1)
  })

  it('respects custom resurface score threshold', () => {
    // With a higher threshold (80), a score of 70 becomes a miss.
    const sig = buildReviewSignal({ attempts: [attempt('a', 70)] }, { resurfaceBelowScore: 80 })
    expect(sig.mistakeSentenceIds.has('a')).toBe(true)
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

  it('has a positive cooldownWindow', () => {
    expect(DEFAULT_WEIGHTS.cooldownWindow).toBeGreaterThan(0)
  })
})
