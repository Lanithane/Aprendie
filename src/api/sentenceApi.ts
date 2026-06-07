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
  // The everyday-domain the sentence was built on (a category `domain` string), used by the practice
  // card's topic chip and to honor a pinned topic. Null for legacy rows generated before themes.
  theme: string | null
  wordBreakdown: WordToken[]
}

export interface FetchSentenceParams {
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
  level?: LevelCode | null
  // A pinned-topic id (see shared/categories); when set the server filters/generates to that topic.
  category?: string | null
}

// Blocking warm: ensure the slice has at least one sentence (inline-generating if the shared corpus
// is cold), so the next fetch lands warm. Awaited by onboarding behind a "preparing" screen, so the
// learner's first practice sentence is ready instead of cold-starting on the practice page.
export function warmFirstSentences(params: FetchSentenceParams): Promise<void> {
  const body: Record<string, string> = {
    learnLanguage: params.learnLanguage,
    guessLanguage: params.guessLanguage,
    locale: params.locale,
  }
  if (params.level) body.level = params.level
  return api<{ ok: boolean }>('/api/sentence/warm', {
    method: 'POST',
    body: JSON.stringify(body),
  }).then(() => undefined)
}

export function fetchSentence(params: FetchSentenceParams): Promise<SentenceDto> {
  const search = new URLSearchParams({
    learnLanguage: params.learnLanguage,
    guessLanguage: params.guessLanguage,
    locale: params.locale,
  })
  if (params.level) search.set('level', params.level)
  if (params.category) search.set('category', params.category)
  return api<SentenceDto>(`/api/sentence?${search.toString()}`)
}
