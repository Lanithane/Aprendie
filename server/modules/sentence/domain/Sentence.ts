import type { SpanishLocale } from '../../../../shared/types'
import type { SentenceRow } from '../../../infrastructure/db/schema'

export interface SentenceView {
  id: string
  locale: SpanishLocale
  spanish: string
  expectedEnglish: string
  difficulty: number | null
  grammarFocus: string | null
}

export interface GeneratedSentence {
  spanish: string
  expectedEnglish: string
  difficulty: number
  grammarFocus: string
}

export function toSentenceView(row: SentenceRow): SentenceView {
  return {
    id: row.id,
    locale: row.locale as SpanishLocale,
    spanish: row.spanish,
    expectedEnglish: row.expectedEnglish,
    difficulty: row.difficulty,
    grammarFocus: row.grammarFocus,
  }
}
