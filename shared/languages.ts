// Language + locale registry shared by the frontend (src/) and backend (server/).
// A "language" is a BCP-47 base subtag ('es'); a "locale" is a region-qualified tag
// ('es-MX'). The learn side carries a language + locale; the guess side only a language
// (region is irrelevant to the answer the learner types).

export type LanguageCode = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt'

export type LocaleCode = string

export interface LocaleOption {
  code: LocaleCode
  label: string
}

export interface LanguageDef {
  code: LanguageCode
  name: string
  endonym: string
  // Empty => the language has no regional split; its locale is the bare language code.
  locales: LocaleOption[]
}

export const LANGUAGES: Record<LanguageCode, LanguageDef> = {
  en: {
    code: 'en',
    name: 'English',
    endonym: 'English',
    locales: [
      { code: 'en-US', label: 'United States' },
      { code: 'en-GB', label: 'United Kingdom' },
    ],
  },
  es: {
    code: 'es',
    name: 'Spanish',
    endonym: 'Español',
    locales: [
      { code: 'es-MX', label: 'Mexico' },
      { code: 'es-ES', label: 'Spain' },
      { code: 'es-AR', label: 'Argentina' },
    ],
  },
  fr: {
    code: 'fr',
    name: 'French',
    endonym: 'Français',
    locales: [
      { code: 'fr-FR', label: 'France' },
      { code: 'fr-CA', label: 'Canada' },
    ],
  },
  de: {
    code: 'de',
    name: 'German',
    endonym: 'Deutsch',
    locales: [
      { code: 'de-DE', label: 'Germany' },
      { code: 'de-AT', label: 'Austria' },
      { code: 'de-CH', label: 'Switzerland' },
    ],
  },
  it: {
    code: 'it',
    name: 'Italian',
    endonym: 'Italiano',
    locales: [{ code: 'it-IT', label: 'Italy' }],
  },
  pt: {
    code: 'pt',
    name: 'Portuguese',
    endonym: 'Português',
    locales: [
      { code: 'pt-BR', label: 'Brazil' },
      { code: 'pt-PT', label: 'Portugal' },
    ],
  },
}

export const SUPPORTED_LANGUAGE_CODES = Object.keys(LANGUAGES) as LanguageCode[]

export interface LanguagePair {
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
}

export const DEFAULT_PAIR: LanguagePair = {
  learnLanguage: 'es',
  guessLanguage: 'en',
  locale: 'es-MX',
}

// One meaningful token of a learn-language sentence, with its dictionary form and a
// meaning expressed in the guess language. Generated upfront with each sentence.
export interface WordToken {
  surface: string
  lemma: string
  gloss: string
  partOfSpeech: string
}

export function isSupportedLanguage(code: string): code is LanguageCode {
  return Object.prototype.hasOwnProperty.call(LANGUAGES, code)
}

export function languageName(code: LanguageCode): string {
  return LANGUAGES[code]?.name ?? code
}

export function localesFor(language: LanguageCode): LocaleOption[] {
  return LANGUAGES[language]?.locales ?? []
}

export function defaultLocaleFor(language: LanguageCode): LocaleCode {
  const locales = localesFor(language)
  return locales.length > 0 ? locales[0].code : language
}

export function isValidLocaleFor(language: LanguageCode, locale: string): boolean {
  const locales = localesFor(language)
  if (locales.length === 0) return locale === language
  return locales.some((l) => l.code === locale)
}
