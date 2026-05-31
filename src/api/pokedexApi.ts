import { api } from './client'
import type { LanguageCode } from '../../shared/languages'

export type LexemeSort = 'seen' | 'incorrect' | 'alpha'

export interface LexemeStatsDto {
  lemma: string
  partOfSpeech: string
  seenCount: number
  correctCount: number
  incorrectCount: number
  firstSeenAt: string
  lastSeenAt: string
}

export interface VariantStatsDto {
  surface: string
  seenCount: number
  lastSeenAt: string
}

export interface RootDetailDto extends LexemeStatsDto {
  variants: VariantStatsDto[]
}

export function fetchPokedex(
  learnLanguage: LanguageCode,
  sort: LexemeSort
): Promise<LexemeStatsDto[]> {
  const search = new URLSearchParams({ learnLanguage, sort })
  return api<LexemeStatsDto[]>(`/api/pokedex?${search.toString()}`)
}

export function fetchRootDetail(
  learnLanguage: LanguageCode,
  lemma: string
): Promise<RootDetailDto> {
  const search = new URLSearchParams({ learnLanguage })
  return api<RootDetailDto>(`/api/pokedex/${encodeURIComponent(lemma)}?${search.toString()}`)
}

export function fetchPokedexLanguages(): Promise<LanguageCode[]> {
  return api<LanguageCode[]>('/api/pokedex/languages')
}
