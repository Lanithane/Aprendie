import type { ReactNode } from 'react'
import { I18nextProvider } from 'react-i18next'
import i18n from './index'
import { useUiLanguageSync } from '../hooks/useUiLanguageSync'

// Owns the live binding from known language → active UI language. A provider is the sanctioned
// home for this effect (per the repo's useEffect rule). Must sit inside AuthProvider, since the
// sync reads the language pair (which reads the authed user).
export function I18nProvider({ children }: { children: ReactNode }) {
  useUiLanguageSync()
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
