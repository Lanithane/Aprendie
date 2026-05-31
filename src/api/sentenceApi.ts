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

// Fire-and-forget background pool warm. No awaiting — the server starts generating immediately
// and returns 200; the caller doesn't need the result.
export function warmPool(params: FetchSentenceParams): void {
  const body: Record<string, string> = {
    learnLanguage: params.learnLanguage,
    guessLanguage: params.guessLanguage,
    locale: params.locale,
  }
  if (params.level) body.level = params.level
  void api<{ ok: boolean }>('/api/sentence/prewarm', {
    method: 'POST',
    body: JSON.stringify(body),
  }).catch(() => {
    // best-effort — a failed prewarm just means the first sentence generates inline
  })
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
