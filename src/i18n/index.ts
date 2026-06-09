// i18n singleton. The UI is rendered in the user's *known* language (the language pair's
// `guessLanguage`); this module owns the i18next instance and bundles every catalog so there's
// no async load. The active language is driven imperatively from the known language by
// `useUiLanguageSync` (mounted by `I18nProvider`) — we deliberately don't use a language-detector
// plugin. `en` is both the base catalog and the fallback for any missing key.
import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import { SUPPORTED_LANGUAGE_CODES } from '../../shared/languages'
import { resolveInitialKnownLanguage } from '../hooks/useLanguagePair'
import en from './locales/en.json'
import es from './locales/es.json'
import fr from './locales/fr.json'
import de from './locales/de.json'
import it from './locales/it.json'
import pt from './locales/pt.json'

export const defaultNS = 'translation'

export const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  it: { translation: it },
  pt: { translation: pt },
} as const

void i18next.use(initReactI18next).init({
  resources,
  lng: resolveInitialKnownLanguage(),
  fallbackLng: 'en',
  supportedLngs: SUPPORTED_LANGUAGE_CODES,
  defaultNS,
  returnNull: false,
  interpolation: { escapeValue: false }, // React already escapes
})

export default i18next
