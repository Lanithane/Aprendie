import { describe, it, expect } from 'vitest'
import { DECKS, FUNCTION_DECKS, NOUN_DECKS, deckById, isDeckId } from './decks'
import { CATEGORIES } from './categories'

describe('decks registry', () => {
  it('has globally unique ids across function and noun decks', () => {
    expect(new Set(DECKS.map((d) => d.id)).size).toBe(DECKS.length)
  })

  it('has one noun deck per category, namespaced and appended after the function decks', () => {
    expect(NOUN_DECKS).toHaveLength(CATEGORIES.length)
    for (const category of CATEGORIES) {
      const deck = deckById(`nouns-${category.id}`)
      expect(deck?.kind).toBe('noun')
      expect(deck?.label).toBe(category.label)
    }
    // Noun decks come after every function deck so they render as a second group in the picker.
    expect(DECKS.slice(0, FUNCTION_DECKS.length)).toEqual(FUNCTION_DECKS)
    expect(DECKS.slice(FUNCTION_DECKS.length)).toEqual(NOUN_DECKS)
  })

  it('round-trips ids through the lookup helpers', () => {
    for (const deck of DECKS) {
      expect(deckById(deck.id)).toBe(deck)
      expect(isDeckId(deck.id)).toBe(true)
    }
    expect(deckById('not-a-deck')).toBeUndefined()
    expect(isDeckId('not-a-deck')).toBe(false)
  })
})
