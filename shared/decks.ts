// Flash-card deck registry — the closed-vocabulary sets the card generator works from. Each `spec`
// is a plain-English description of the words to produce, handed verbatim to Claude; `size` caps
// generation so the deck stays focused (months = 12, days = 7, etc.). The `id` is the stable slug
// used over the wire and as a corpus dedup key; never rename one after cards have been generated.
//
// `kind: 'function'` covers closed-class / high-frequency items (conjunctions, pronouns, etc.).
// `kind: 'noun'` is reserved for phase-2 category-noun decks derived from `shared/categories.ts`.

export interface DeckDef {
  id: string
  label: string
  kind: 'function' | 'noun'
  // Plain-English spec handed to the generator describing exactly which words to produce.
  spec: string
  // Target card count — the generator is asked for at most this many cards.
  size: number
}

export const DECKS: DeckDef[] = [
  {
    id: 'conjunctions',
    label: 'Conjunctions',
    kind: 'function',
    spec: 'the most common conjunctions used in everyday speech: and, or, but, because, if, when, that, although, so, while, then, before, after, since, until',
    size: 15,
  },
  {
    id: 'pronouns',
    label: 'Pronouns',
    kind: 'function',
    spec: 'the most common personal, possessive, and demonstrative pronouns: I, you, he, she, it, we, they, me, him, her, us, them, this, that, who, what, which, my, your, his, her, our, their',
    size: 22,
  },
  {
    id: 'common-verbs',
    label: 'Common Verbs',
    kind: 'function',
    spec: 'the most essential everyday verbs (dictionary/infinitive form): be, have, do, go, want, need, can, know, get, make, see, come, think, take, use, give, say, tell, like, work, call, try, ask, feel, become, leave, put, mean, let, keep',
    size: 30,
  },
  {
    id: 'numbers',
    label: 'Numbers',
    kind: 'function',
    spec: 'cardinal numbers from zero through twenty (0-20), then thirty, forty, fifty, sixty, seventy, eighty, ninety, one hundred, one thousand — produce one card per number with its written word form as the lemma',
    size: 31,
  },
  {
    id: 'months',
    label: 'Months',
    kind: 'function',
    spec: 'all twelve months of the year in order: January, February, March, April, May, June, July, August, September, October, November, December',
    size: 12,
  },
  {
    id: 'days',
    label: 'Days of the Week',
    kind: 'function',
    spec: 'all seven days of the week in order: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday',
    size: 7,
  },
]

export function deckById(id: string): DeckDef | undefined {
  return DECKS.find((d) => d.id === id)
}

export function isDeckId(id: string): boolean {
  return DECKS.some((d) => d.id === id)
}
