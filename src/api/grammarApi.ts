import { api } from './client'
import type { LanguageCode, LocaleCode } from '../../shared/languages'
import type { GrammarReference } from '../../shared/grammar'

export type {
  GrammarReference,
  GrammarPosSection,
  GrammarDetailBlock,
  GrammarDetailRow,
  GrammarExample,
} from '../../shared/grammar'

// The grammar reference (POS overview + drill-down) for one pair. Member words and example
// sentences are in the learn language; explanations and translations are in the guess language.
// Generated once and shared across users server-side, so repeat visits are cheap.
export function fetchGrammar(
  learnLanguage: LanguageCode,
  guessLanguage: LanguageCode,
  locale: LocaleCode
): Promise<GrammarReference> {
  const search = new URLSearchParams({ learnLanguage, guessLanguage, locale })
  return api<GrammarReference>(`/api/grammar?${search.toString()}`)
}
