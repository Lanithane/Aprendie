import { api } from './client'
import type { LanguageCode, LocaleCode } from '../../shared/languages'

export interface TranslationRequest {
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
  text: string
  // When true, translate learning → known instead of the default known → learning.
  swapped?: boolean
}

export interface TextTranslation {
  translation: string
  note?: string
}

export function translateText(req: TranslationRequest): Promise<TextTranslation> {
  return api<TextTranslation>('/api/translate', {
    method: 'POST',
    body: JSON.stringify(req),
  })
}
