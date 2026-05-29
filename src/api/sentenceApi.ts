import { api } from './client'
import type { LanguageCode, LocaleCode, WordToken } from '../../shared/languages'
import type { LevelCode } from '../../shared/levels'

export interface SentenceDto {
  id: string
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
  promptText: string
  answerText: string
  level: LevelCode | null
  grammarFocus: string | null
  wordBreakdown: WordToken[]
}

export interface FetchSentenceParams {
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
  level?: LevelCode | null
}

export function fetchSentence(params: FetchSentenceParams): Promise<SentenceDto> {
  const search = new URLSearchParams({
    learnLanguage: params.learnLanguage,
    guessLanguage: params.guessLanguage,
    locale: params.locale,
  })
  if (params.level) search.set('level', params.level)
  return api<SentenceDto>(`/api/sentence?${search.toString()}`)
}
