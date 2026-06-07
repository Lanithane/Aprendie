import * as palabradexRepository from '../persistence/palabradexRepository'
import type { StrugglingLexemeRow } from '../persistence/palabradexRepository'
import {
  toLexemeStatsView,
  toVariantStatsView,
  type LexemeSort,
  type LexemeStatsView,
  type RootDetailView,
} from '../domain/Lexeme'

// Word-level review signal for the sentence picker (Epic 21): the user's most-missed lemmas in a
// language, prefiltered to those with a real miss history and capped to a bounded set. Thresholds
// live here so the sentence module just asks for "the words this user struggles with"; the
// struggle-ratio cut happens in the pure `buildReviewSignal`. `MIN_LIFETIME_MISSES` matches its
// `minLexemeMisses` default so the SQL prefilter and the domain cut agree.
const MIN_LIFETIME_MISSES = 2
const MAX_STRUGGLING_LEXEMES = 200

export async function getStrugglingLexemes(
  userId: string,
  learnLanguage: string
): Promise<StrugglingLexemeRow[]> {
  return palabradexRepository.listStrugglingLexemes(
    userId,
    learnLanguage,
    MIN_LIFETIME_MISSES,
    MAX_STRUGGLING_LEXEMES
  )
}

export async function listPalabradex(
  userId: string,
  learnLanguage: string,
  sort: LexemeSort
): Promise<LexemeStatsView[]> {
  const rows = await palabradexRepository.listLexemes(userId, learnLanguage, sort)
  return rows.map(toLexemeStatsView)
}

export async function getRootDetail(
  userId: string,
  learnLanguage: string,
  lemma: string
): Promise<RootDetailView | null> {
  const root = await palabradexRepository.getLexeme(userId, learnLanguage, lemma)
  if (!root) return null
  const variants = await palabradexRepository.listVariants(userId, learnLanguage, lemma)
  return { ...toLexemeStatsView(root), variants: variants.map(toVariantStatsView) }
}

export async function listLanguages(userId: string): Promise<string[]> {
  return palabradexRepository.distinctLanguages(userId)
}

// Per-lemma mastery stats for the flash-card picker. Returns the raw rows (including
// lastSeenAt) so the caller can score by both struggle rate and recency. The caller filters
// to the lemmas it cares about (the current deck) after the query returns.
export async function getLexemeStatsForDeck(userId: string, learnLanguage: string) {
  return palabradexRepository.listLexemes(userId, learnLanguage, 'seen')
}
