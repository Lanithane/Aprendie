import { api } from './client'
import type { LanguageCode, LocaleCode } from '../../shared/languages'

export function resolveLocale(
  learnLanguage: LanguageCode,
  location: string
): Promise<{ locale: LocaleCode }> {
  return api<{ locale: LocaleCode }>('/api/language/resolve-locale', {
    method: 'POST',
    body: JSON.stringify({ learnLanguage, location }),
  })
}
