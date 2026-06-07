// Flash-card deck registry — the vocabulary sets the card generator works from. Each `spec` is a
// plain-English description of the words to produce, handed verbatim to Claude; `size` caps
// generation so the deck stays focused (months = 12, days = 7, etc.). The `id` is the stable slug
// used over the wire and as a corpus dedup key; never rename one after cards have been generated.
//
// `kind: 'function'` covers closed-class / high-frequency items (conjunctions, pronouns, etc.) —
// closed sets whose spec enumerates every word.
// `kind: 'noun'` covers the open-class category-noun decks derived from `shared/categories.ts`: one
// deck per sentence category, asking the generator for that topic's most common everyday nouns. They
// are appended after the function decks (see `NOUN_DECKS` below) so they read as a second group in
// the picker.

import { CATEGORIES } from './categories'

export interface DeckDef {
  id: string
  label: string
  kind: 'function' | 'noun'
  // Plain-English spec handed to the generator describing exactly which words to produce.
  spec: string
  // Target card count — the generator is asked for at most this many cards.
  size: number
  // Three representative words shown as a preview subtitle under the deck label in the picker.
  // Display hint only — kept in the guess/display language (English).
  examples: [string, string, string]
}

// Closed-class / fixed-vocabulary decks. Order here is the picker order for the first group.
export const FUNCTION_DECKS: DeckDef[] = [
  {
    id: 'conjunctions',
    label: 'Conjunctions',
    kind: 'function',
    spec: 'the most common conjunctions used in everyday speech: and, or, but, because, if, when, that, although, so, while, then, before, after, since, until',
    size: 15,
    examples: ['and', 'but', 'because'],
  },
  {
    id: 'pronouns',
    label: 'Pronouns',
    kind: 'function',
    spec: 'the most common personal, possessive, and demonstrative pronouns: I, you, he, she, it, we, they, me, him, her, us, them, this, that, who, what, which, my, your, his, her, our, their',
    size: 22,
    examples: ['I', 'you', 'they'],
  },
  {
    id: 'common-verbs',
    label: 'Common Verbs',
    kind: 'function',
    spec: 'the most essential everyday verbs (dictionary/infinitive form): be, have, do, go, want, need, can, know, get, make, see, come, think, take, use, give, say, tell, like, work, call, try, ask, feel, become, leave, put, mean, let, keep',
    size: 30,
    examples: ['be', 'have', 'go'],
  },
  {
    id: 'numbers',
    label: 'Numbers',
    kind: 'function',
    spec: 'cardinal numbers from zero through twenty (0-20), then thirty, forty, fifty, sixty, seventy, eighty, ninety, one hundred, one thousand — produce one card per number with its written word form as the lemma',
    size: 31,
    examples: ['one', 'two', 'three'],
  },
  {
    id: 'months',
    label: 'Months',
    kind: 'function',
    spec: 'all twelve months of the year in order: January, February, March, April, May, June, July, August, September, October, November, December',
    size: 12,
    examples: ['January', 'June', 'December'],
  },
  {
    id: 'days',
    label: 'Days of the Week',
    kind: 'function',
    spec: 'all seven days of the week in order: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday',
    size: 7,
    examples: ['Monday', 'Friday', 'Sunday'],
  },
]

// How many cards a category-noun deck asks for. Nouns are an open class, so the spec asks the model
// to pick the most common ones rather than enumerating them.
const NOUN_DECK_SIZE = 20

// One noun deck per sentence category (see `shared/categories.ts`). `id` is namespaced with a
// `nouns-` prefix so it never collides with a function deck's id (e.g. the `numbers` function deck
// vs. the `numbers` category). `label` reuses the category's display label.
export const NOUN_DECKS: DeckDef[] = CATEGORIES.map((category) => ({
  id: `nouns-${category.id}`,
  label: category.label,
  kind: 'noun' as const,
  spec: `the ${NOUN_DECK_SIZE} most common everyday nouns about ${category.domain}, in their dictionary singular form — concrete, high-frequency words a beginner learner needs to talk about this topic`,
  size: NOUN_DECK_SIZE,
  examples: category.examples,
}))

// The full registry the picker, generator, and seed script all read: function decks first, then the
// category-noun decks as a second scrollable group.
export const DECKS: DeckDef[] = [...FUNCTION_DECKS, ...NOUN_DECKS]

export function deckById(id: string): DeckDef | undefined {
  return DECKS.find((d) => d.id === id)
}

export function isDeckId(id: string): boolean {
  return DECKS.some((d) => d.id === id)
}
