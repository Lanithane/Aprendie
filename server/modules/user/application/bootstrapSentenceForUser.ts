import type { UserRow } from '../../../infrastructure/db/schema'
import type { SentenceView } from '../../sentence/domain/Sentence'
import { getBootstrapSentence } from '../../sentence/application/getNextSentence'
import { isValidLanguagePair, type LanguageCode } from '../../../../shared/languages'

// Best-effort first sentence for the /api/me bootstrap, collapsing the
// /me -> /sentence/next waterfall on app load. Returns null unless the account is fully
// set up (API key + valid language pair + level) AND the pool is already warm — it never
// blocks on generation. The client seeds this once; otherwise it fetches the first
// sentence the normal way (cross-module user -> sentence application orchestration).
export function bootstrapSentenceForUser(user: UserRow): Promise<SentenceView | null> {
  const { learnLanguage, guessLanguage, locale, level } = user
  if (!user.encryptedAnthropicKey || !level) return Promise.resolve(null)
  if (!isValidLanguagePair(learnLanguage, guessLanguage, locale)) {
    return Promise.resolve(null)
  }
  return getBootstrapSentence({
    user,
    learnLanguage: learnLanguage as LanguageCode,
    guessLanguage: guessLanguage as LanguageCode,
    locale: locale ?? '',
    level,
  })
}
