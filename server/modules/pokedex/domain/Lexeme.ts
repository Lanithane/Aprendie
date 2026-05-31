import type { LanguageCode } from '../../../../shared/languages'
import type { LexemeStatsRow, LexemeVariantStatsRow } from '../../../infrastructure/db/schema'

export interface LexemeStatsView {
  lemma: string
  partOfSpeech: string
  seenCount: number
  correctCount: number
  incorrectCount: number
  firstSeenAt: string
  lastSeenAt: string
}

export interface VariantStatsView {
  surface: string
  seenCount: number
  lastSeenAt: string
}

export interface RootDetailView extends LexemeStatsView {
  variants: VariantStatsView[]
}

export function toLexemeStatsView(row: LexemeStatsRow): LexemeStatsView {
  return {
    lemma: row.lemma,
    partOfSpeech: row.partOfSpeech,
    seenCount: row.seenCount,
    correctCount: row.correctCount,
    incorrectCount: row.incorrectCount,
    firstSeenAt: row.firstSeenAt.toISOString(),
    lastSeenAt: row.lastSeenAt.toISOString(),
  }
}

export function toVariantStatsView(row: LexemeVariantStatsRow): VariantStatsView {
  return {
    surface: row.surface,
    seenCount: row.seenCount,
    lastSeenAt: row.lastSeenAt.toISOString(),
  }
}

export type LexemeSort = 'seen' | 'incorrect' | 'alpha'

export const LEXEME_SORTS: readonly LexemeSort[] = ['seen', 'incorrect', 'alpha']

// Narrows an arbitrary learnLanguage code coming off the row to the shared union; the column
// is loose-typed text, so callers that need the union (the DTO) coerce here.
export function asLanguageCode(code: string): LanguageCode {
  return code as LanguageCode
}
