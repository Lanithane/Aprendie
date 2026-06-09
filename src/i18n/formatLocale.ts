import { enUS, es, fr, de, it, pt, type Locale } from 'date-fns/locale'
import type { LanguageCode } from '../../shared/languages'

// Date/number formatting follows the active UI (known) language too, so a French UI reads
// "8 juin" and "1 234", not "Jun 8" / "1,234". Keyed by the same language codes the catalog uses;
// anything unexpected falls back to English. Pure maps — components read the active language from
// `i18n.language` (via useTranslation, so they re-render on a language switch) and pass the result
// to date-fns `format` / `Intl.NumberFormat`.
const DATE_FNS_LOCALES: Record<LanguageCode, Locale> = { en: enUS, es, fr, de, it, pt }

export function dateFnsLocaleFor(language: string): Locale {
  return DATE_FNS_LOCALES[language as LanguageCode] ?? enUS
}

export function numberFormatFor(language: string): Intl.NumberFormat {
  return new Intl.NumberFormat(language || 'en')
}
