// CEFR-aligned difficulty levels shared by the frontend (UI labels) and backend (prompt
// rubric). The ladder runs from two pre-A1 levels up through C2. `blurb` is a
// language-agnostic calibration hint that goes into the generation prompt and the UI tooltip.

export type LevelCode = 'starter' | 'foundation' | 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2'

export interface LevelDef {
  code: LevelCode
  name: string
  cefr: string | null
  order: number
  blurb: string
}

export const LEVELS: LevelDef[] = [
  {
    code: 'starter',
    name: 'Starter Level',
    cefr: null,
    order: 0,
    blurb:
      'Absolute first contact: single high-frequency words and 2-3 word set phrases. Present tense only, concrete everyday nouns, cognates where natural.',
  },
  {
    code: 'foundation',
    name: 'Foundation Level',
    cefr: null,
    order: 1,
    blurb:
      'Very simple fixed everyday phrases of 3-5 words (greetings, basic needs, numbers, simple statements). Present tense, concrete vocabulary, no subordinate clauses.',
  },
  {
    code: 'a1',
    name: 'Beginner Level',
    cefr: 'A1',
    order: 2,
    blurb:
      'Simple sentences about familiar everyday topics. Basic present tense, simple connectors, high-frequency vocabulary.',
  },
  {
    code: 'a2',
    name: 'Elementary Level',
    cefr: 'A2',
    order: 3,
    blurb:
      'Short connected sentences on routine matters. Common past and future tenses, everyday vocabulary, simple subordination.',
  },
  {
    code: 'b1',
    name: 'Intermediate Level',
    cefr: 'B1',
    order: 4,
    blurb:
      'Everyday situations, plans and opinions. Multiple tenses, some subordinate clauses, moderately varied vocabulary.',
  },
  {
    code: 'b2',
    name: 'Upper Intermediate Level',
    cefr: 'B2',
    order: 5,
    blurb:
      'Abstract and concrete topics with clear argument. Complex sentences, varied moods and aspects, broader vocabulary and some idioms.',
  },
  {
    code: 'c1',
    name: 'Advanced Level',
    cefr: 'C1',
    order: 6,
    blurb:
      'Nuanced, fluent expression. Complex syntax, idiomatic usage, lower-frequency and figurative vocabulary, register awareness.',
  },
  {
    code: 'c2',
    name: 'Proficiency Level',
    cefr: 'C2',
    order: 7,
    blurb:
      'Near-native subtlety. Sophisticated structure, idioms, register and tone shifts, precise and uncommon vocabulary.',
  },
]

export const LEVEL_CODES = LEVELS.map((l) => l.code)

// null = no fixed level; the generator mixes levels across the batch.
export const DEFAULT_LEVEL: LevelCode | null = null

export function levelByCode(code: string): LevelDef | undefined {
  return LEVELS.find((l) => l.code === code)
}

export function isLevelCode(code: string): code is LevelCode {
  return LEVELS.some((l) => l.code === code)
}

export function levelLabel(code: LevelCode): string {
  const def = levelByCode(code)
  if (!def) return code
  return def.cefr ? `${def.name} (${def.cefr})` : def.name
}
