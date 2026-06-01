import { describe, it, expect } from 'vitest'
import { computeSeenDeltas } from './seenWords'
import type { WordToken } from '../../../../shared/languages'

function tok(surface: string, lemma: string, pos = 'noun'): WordToken {
  return { surface, lemma, partOfSpeech: pos, modifiers: [] }
}

describe('computeSeenDeltas', () => {
  it('counts every appearance as seen and defaults to correct with no mistakes', () => {
    const { lexemes, variants } = computeSeenDeltas([tok('gatos', 'gato'), tok('gato', 'gato')], [])
    expect(lexemes).toHaveLength(1)
    expect(lexemes[0]).toMatchObject({ lemma: 'gato', seen: 2, correct: 2, incorrect: 0 })
    // Two distinct surfaces of the same root.
    expect(variants).toHaveLength(2)
    expect(variants.map((v) => v.surface).sort()).toEqual(['gato', 'gatos'])
  })

  it('marks a token incorrect when its surface appears in a mistake sourceText', () => {
    const { lexemes } = computeSeenDeltas(
      [tok('corro', 'correr'), tok('rápido', 'rápido')],
      [{ sourceText: 'corro rápido' }]
    )
    const byLemma = Object.fromEntries(lexemes.map((l) => [l.lemma, l]))
    expect(byLemma['correr']).toMatchObject({ seen: 1, incorrect: 1, correct: 0 })
    expect(byLemma['rápido']).toMatchObject({ seen: 1, incorrect: 1, correct: 0 })
  })

  it('matches case-insensitively and ignores attached punctuation on the surface', () => {
    const { lexemes } = computeSeenDeltas(
      [tok('¿Cómo', 'cómo'), tok('estás?', 'estar')],
      [{ sourceText: 'como estas' }]
    )
    // 'cómo' has an accent the mistake text lacks → no match → correct.
    expect(lexemes.find((l) => l.lemma === 'cómo')).toMatchObject({ correct: 1, incorrect: 0 })
    // 'estás?' edge-strips to 'estás'; mistake word is 'estas' (no accent) → no match.
    expect(lexemes.find((l) => l.lemma === 'estar')).toMatchObject({ correct: 1, incorrect: 0 })
  })

  it('uses word boundaries, not substring matching', () => {
    const { lexemes } = computeSeenDeltas(
      [tok('arte', 'arte')],
      [{ sourceText: 'partes' }] // contains "arte" as a substring but not as a word
    )
    expect(lexemes[0]).toMatchObject({ correct: 1, incorrect: 0 })
  })

  it('skips tokens with a blank lemma or surface', () => {
    const { lexemes, variants } = computeSeenDeltas([tok('', 'x'), tok('y', '')], [])
    expect(lexemes).toHaveLength(0)
    expect(variants).toHaveLength(0)
  })

  it('splits the same root across correct and incorrect appearances', () => {
    const { lexemes } = computeSeenDeltas(
      [tok('de', 'de'), tok('de', 'de')],
      [{ sourceText: 'de' }]
    )
    // Both appearances share the surface "de", which is in the mistake → both incorrect.
    expect(lexemes[0]).toMatchObject({ lemma: 'de', seen: 2, incorrect: 2, correct: 0 })
  })
})
