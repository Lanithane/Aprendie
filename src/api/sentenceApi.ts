import { api } from './client'
import type { SpanishLocale } from '../../shared/types'

export interface SentenceDto {
  id: string
  spanish: string
  expectedEnglish: string
  difficulty: number | null
  grammarFocus: string | null
  locale: string
}

export interface FetchSentenceParams {
  locale: SpanishLocale
  difficulty?: number | null
}

export function fetchSentence(params: FetchSentenceParams): Promise<SentenceDto> {
  const search = new URLSearchParams({ locale: params.locale })
  if (params.difficulty !== null && params.difficulty !== undefined) {
    search.set('difficulty', String(params.difficulty))
  }
  return api<SentenceDto>(`/api/sentence?${search.toString()}`)
}
