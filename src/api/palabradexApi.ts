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

export function fetchPalabradex(
  learnLanguage: LanguageCode,
  sort: LexemeSort
): Promise<LexemeStatsDto[]> {
  const search = new URLSearchParams({ learnLanguage, sort })
  return api<LexemeStatsDto[]>(`/api/palabradex?${search.toString()}`)
}

export function fetchRootDetail(
  learnLanguage: LanguageCode,
  lemma: string
): Promise<RootDetailDto> {
  const search = new URLSearchParams({ learnLanguage })
  return api<RootDetailDto>(`/api/palabradex/${encodeURIComponent(lemma)}?${search.toString()}`)
}

export function fetchPalabradexLanguages(): Promise<LanguageCode[]> {
  return api<LanguageCode[]>('/api/palabradex/languages')
}

// A root's meaning, translated into the known (guess) language. Generated once and shared
// across users server-side, so repeat lookups are cheap.
export function fetchLexemeDefinition(
  learnLanguage: LanguageCode,
  guessLanguage: LanguageCode,
  lemma: string
): Promise<{ definition: string }> {
  const search = new URLSearchParams({ learnLanguage, guessLanguage })
  return api<{ definition: string }>(
    `/api/palabradex/${encodeURIComponent(lemma)}/definition?${search.toString()}`
  )
}
