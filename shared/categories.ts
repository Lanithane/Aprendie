// The everyday-domain "categories" the sentence generator rotates through, shared by the backend
// (the generation prompt's theme list) and the frontend (the practice-card category chip). Each
// `domain` is the verbatim string handed to the model and echoed back into `sentences.theme`, so the
// registry doubles as the map between a corpus row's stored theme and a short, pickable label.
//
// `id` is the stable slug used over the wire and persisted as the learner's pinned-topic preference;
// `domain` MUST stay byte-identical to the strings already stored on corpus rows (changing one
// orphans every sentence built on it); `label` is the short human display for the chip and menu.

export interface CategoryDef {
  id: string
  domain: string
  label: string
  // Three representative everyday words for the topic, shown as a preview subtitle in the UI (e.g.
  // the flash-card deck picker). Display hint only — kept in the guess/display language (English).
  examples: [string, string, string]
}

// Ordered alphabetically by `label` so the picker menu reads A→Z; keep it sorted when adding topics.
export const CATEGORIES: CategoryDef[] = [
  {
    id: 'animals',
    domain: 'animals and nature',
    label: 'Animals & Nature',
    examples: ['dog', 'bird', 'tree'],
  },
  {
    id: 'arts',
    domain: 'art, music, film and books',
    label: 'Arts & Media',
    examples: ['movie', 'song', 'book'],
  },
  {
    id: 'city',
    domain: 'city life and the neighbourhood',
    label: 'City Life',
    examples: ['street', 'park', 'building'],
  },
  {
    id: 'clothes',
    domain: 'clothes and appearance',
    label: 'Clothes',
    examples: ['shirt', 'shoes', 'dress'],
  },
  {
    id: 'routine',
    domain: 'daily routine and chores',
    label: 'Daily Routine',
    examples: ['shower', 'breakfast', 'sleep'],
  },
  {
    id: 'environment',
    domain: 'the natural world and the environment',
    label: 'Environment',
    examples: ['ocean', 'forest', 'climate'],
  },
  {
    id: 'family',
    domain: 'family and relationships',
    label: 'Family',
    examples: ['mother', 'brother', 'child'],
  },
  {
    id: 'feelings',
    domain: 'feelings, opinions and personality',
    label: 'Feelings',
    examples: ['joy', 'fear', 'hope'],
  },
  {
    id: 'food',
    domain: 'food, cooking and eating out',
    label: 'Food & Dining',
    examples: ['bread', 'coffee', 'dinner'],
  },
  {
    id: 'greetings',
    domain: 'greetings and introductions',
    label: 'Greetings',
    examples: ['hello', 'name', 'goodbye'],
  },
  {
    id: 'health',
    domain: 'health, the body and the doctor',
    label: 'Health',
    examples: ['doctor', 'medicine', 'body'],
  },
  {
    id: 'hobbies',
    domain: 'hobbies and free time',
    label: 'Hobbies',
    examples: ['music', 'reading', 'games'],
  },
  {
    id: 'holidays',
    domain: 'holidays, festivals and celebrations',
    label: 'Holidays',
    examples: ['party', 'gift', 'festival'],
  },
  {
    id: 'home',
    domain: 'home, rooms and furniture',
    label: 'Home',
    examples: ['kitchen', 'table', 'bed'],
  },
  {
    id: 'numbers',
    domain: 'numbers, time and dates',
    label: 'Numbers & Time',
    examples: ['hour', 'week', 'clock'],
  },
  {
    id: 'future',
    domain: 'plans, dreams and the future',
    label: 'Plans & Future',
    examples: ['dream', 'goal', 'plan'],
  },
  {
    id: 'shopping',
    domain: 'shopping and money',
    label: 'Shopping & Money',
    examples: ['store', 'price', 'money'],
  },
  {
    id: 'sports',
    domain: 'sports and exercise',
    label: 'Sports',
    examples: ['ball', 'team', 'game'],
  },
  {
    id: 'technology',
    domain: 'technology, phones and the internet',
    label: 'Technology',
    examples: ['phone', 'computer', 'internet'],
  },
  {
    id: 'travel',
    domain: 'travel, directions and transport',
    label: 'Travel',
    examples: ['airport', 'ticket', 'map'],
  },
  {
    id: 'weather',
    domain: 'weather and the seasons',
    label: 'Weather',
    examples: ['rain', 'sun', 'snow'],
  },
  {
    id: 'work',
    domain: 'work, study and school',
    label: 'Work & Study',
    examples: ['office', 'teacher', 'school'],
  },
]

// The plain domain strings, in registry order — the generator's theme pool (drop-in for the old
// private THEME_DOMAINS array).
export const CATEGORY_DOMAINS = CATEGORIES.map((c) => c.domain)

export function categoryById(id: string): CategoryDef | undefined {
  return CATEGORIES.find((c) => c.id === id)
}

// Map a stored `sentences.theme` (a verbatim domain string) back to its category, or undefined for a
// legacy/off-list theme the registry doesn't know.
export function categoryByDomain(domain: string): CategoryDef | undefined {
  return CATEGORIES.find((c) => c.domain === domain)
}

export function isCategoryId(id: string): boolean {
  return CATEGORIES.some((c) => c.id === id)
}
