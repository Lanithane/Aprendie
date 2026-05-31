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

// One morphological change that derives an inflected surface word from its lemma — a suffix,
// prefix, or stem change. `segment` is the changed letters as they appear (in the learn
// language); `note` explains the grammatical function of that change and is written in the
// GUESS language so the learner can read the grammar — but it never translates the word.
export interface WordModifier {
  segment: string // the affix or changed letters as they appear, e.g. "-es", "ie"
  note: string // grammatical function in the guess language, e.g. "2nd person singular, present"
}

// One meaningful token of a learn-language sentence. The vocabulary stays immersive — the
// dictionary form (lemma) is in the LEARN language and the word's meaning is never translated.
// Grammatical metadata (part of speech, modifier notes) is in the GUESS language so the
// learner can read the grammar. When the surface word is inflected, `modifiers` decomposes the
// change; an empty array means it's already the base form. Generated upfront with each sentence.
// `gloss` is only present on Starter-level sentences — a one-word meaning in the guess language
// to give beginners a foothold; omitted at A1 and above to preserve immersion.
export interface WordToken {
  surface: string
  lemma: string
  partOfSpeech: string // a common part-of-speech label in the guess language, e.g. "noun"
  modifiers: WordModifier[] // empty => surface is the base form
  gloss?: string // Starter only: meaning in the guess language
}

// UI label shown in place of the lemma when a surface word is already its own dictionary
// form — repeating the word adds nothing, so we mark it as the root instead. Grammatical
// metadata, so it's keyed by the guess language (like the part of speech).
export const ROOT_LABEL: Record<LanguageCode, string> = {
  en: 'root',
  es: 'raíz',
  fr: 'racine',
  de: 'Grundform',
  it: 'radice',
  pt: 'raiz',
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

// A pair is valid when both sides are supported, distinct, and the locale belongs to the
// learn language. Used to validate the persisted account pair on both client and server.
export function isValidLanguagePair(
  learnLanguage: string | null | undefined,
  guessLanguage: string | null | undefined,
  locale: string | null | undefined
): boolean {
  return (
    typeof learnLanguage === 'string' &&
    typeof guessLanguage === 'string' &&
    typeof locale === 'string' &&
    isSupportedLanguage(learnLanguage) &&
    isSupportedLanguage(guessLanguage) &&
    learnLanguage !== guessLanguage &&
    isValidLocaleFor(learnLanguage, locale)
  )
}
