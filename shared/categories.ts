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
}

// Ordered alphabetically by `label` so the picker menu reads A→Z; keep it sorted when adding topics.
export const CATEGORIES: CategoryDef[] = [
  { id: 'animals', domain: 'animals and nature', label: 'Animals & Nature' },
  { id: 'arts', domain: 'art, music, film and books', label: 'Arts & Media' },
  { id: 'city', domain: 'city life and the neighbourhood', label: 'City Life' },
  { id: 'clothes', domain: 'clothes and appearance', label: 'Clothes' },
  { id: 'routine', domain: 'daily routine and chores', label: 'Daily Routine' },
  { id: 'environment', domain: 'the natural world and the environment', label: 'Environment' },
  { id: 'family', domain: 'family and relationships', label: 'Family' },
  { id: 'feelings', domain: 'feelings, opinions and personality', label: 'Feelings' },
  { id: 'food', domain: 'food, cooking and eating out', label: 'Food & Dining' },
  { id: 'greetings', domain: 'greetings and introductions', label: 'Greetings' },
  { id: 'health', domain: 'health, the body and the doctor', label: 'Health' },
  { id: 'hobbies', domain: 'hobbies and free time', label: 'Hobbies' },
  { id: 'holidays', domain: 'holidays, festivals and celebrations', label: 'Holidays' },
  { id: 'home', domain: 'home, rooms and furniture', label: 'Home' },
  { id: 'numbers', domain: 'numbers, time and dates', label: 'Numbers & Time' },
  { id: 'future', domain: 'plans, dreams and the future', label: 'Plans & Future' },
  { id: 'shopping', domain: 'shopping and money', label: 'Shopping & Money' },
  { id: 'sports', domain: 'sports and exercise', label: 'Sports' },
  { id: 'technology', domain: 'technology, phones and the internet', label: 'Technology' },
  { id: 'travel', domain: 'travel, directions and transport', label: 'Travel' },
  { id: 'weather', domain: 'weather and the seasons', label: 'Weather' },
  { id: 'work', domain: 'work, study and school', label: 'Work & Study' },
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
