import * as pokedexRepository from '../persistence/pokedexRepository'
import {
  toLexemeStatsView,
  toVariantStatsView,
  type LexemeSort,
  type LexemeStatsView,
  type RootDetailView,
} from '../domain/Lexeme'

export async function listPokedex(
  userId: string,
  learnLanguage: string,
  sort: LexemeSort
): Promise<LexemeStatsView[]> {
  const rows = await pokedexRepository.listLexemes(userId, learnLanguage, sort)
  return rows.map(toLexemeStatsView)
}

export async function getRootDetail(
  userId: string,
  learnLanguage: string,
  lemma: string
): Promise<RootDetailView | null> {
  const root = await pokedexRepository.getLexeme(userId, learnLanguage, lemma)
  if (!root) return null
  const variants = await pokedexRepository.listVariants(userId, learnLanguage, lemma)
  return { ...toLexemeStatsView(root), variants: variants.map(toVariantStatsView) }
}

export async function listLanguages(userId: string): Promise<string[]> {
  return pokedexRepository.distinctLanguages(userId)
}
