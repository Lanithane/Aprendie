// Type-level binding so `t('group.key')` is checked against the English base catalog: a missing
// or misspelled key becomes a `npm run typecheck` error rather than a silent runtime fallback.
import 'i18next'
import type en from './locales/en.json'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: { translation: typeof en }
  }
}
