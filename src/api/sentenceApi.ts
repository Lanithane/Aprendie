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

export interface PrewarmResult {
  pooled: number
}

// Warm a pool ahead of the first request (Epic 11). Fired when onboarding completes so the
// learner lands on a non-cold pool. Best-effort on the caller's side — the server degrades
// silently when the account can't spend, so a resolved promise doesn't guarantee a warm pool.
export function prewarmPool(params: FetchSentenceParams): Promise<PrewarmResult> {
  const body: Record<string, string> = {
    learnLanguage: params.learnLanguage,
    guessLanguage: params.guessLanguage,
    locale: params.locale,
  }
  if (params.level) body.level = params.level
  return api<PrewarmResult>('/api/sentence/prewarm', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
