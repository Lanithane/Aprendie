import { describe, it, expect } from 'vitest'
import { contentHash } from './contentHash'

describe('contentHash', () => {
  it('is stable for identical input', () => {
    expect(contentHash('Hola, ¿cómo estás?')).toBe(contentHash('Hola, ¿cómo estás?'))
  })

  it('collapses case, punctuation and whitespace variants to the same hash (dedup key)', () => {
    const a = contentHash('¿Cómo estás?')
    expect(contentHash('cómo estás')).toBe(a)
    expect(contentHash('  Cómo   estás  ')).toBe(a)
    expect(contentHash('¡Cómo estás!')).toBe(a)
  })

  it('treats accents/diacritics as significant (they change meaning)', () => {
    // "año" (year) vs "ano" — must NOT collide.
    expect(contentHash('año')).not.toBe(contentHash('ano'))
  })

  it('distinguishes genuinely different sentences', () => {
    expect(contentHash('El gato come')).not.toBe(contentHash('El perro come'))
  })

  it('normalizes equivalent unicode compositions to the same hash', () => {
    // Same text, different bytes: precomposed "é" (U+00E9) vs decomposed "e" + combining acute
    // accent (U+0301). NFC folds them so the corpus doesn't store the same sentence twice.
    const precomposed = 'café'
    const decomposed = 'café'
    expect(precomposed).not.toBe(decomposed)
    expect(contentHash(precomposed)).toBe(contentHash(decomposed))
  })
})
