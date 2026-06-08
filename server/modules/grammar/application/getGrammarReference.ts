import type { UserRow } from '../../../infrastructure/db/schema'
import {
  getOperatorAnthropicClient,
  SENTENCE_MODEL,
} from '../../../infrastructure/claude/anthropicClient'
import { assertCanSpend } from '../../user/application/access'
import { assertSpendEnabled } from '../../settings/application/appSettings'
import { assertWithinDailyCap } from '../../usage/application/dailyCap'
import { recordUsage } from '../../showback/application/recordUsage'
import type { LanguageCode, LocaleCode } from '../../../../shared/languages'
import { generateGrammar } from './generateGrammar'
import type { GrammarReference } from '../domain/GrammarReference'
import * as grammarRepository from '../persistence/grammarRepository'

interface GetGrammarParams {
  user: UserRow
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
}

// Returns the grammar reference for the active (learn, guess, locale) triple — the cached row when
// one exists (which costs nothing, so it's ungated), otherwise generates one on the operator key
// behind the same access + spend-pause + daily-cap gates as every other spend path. A miss generates
// rarely: the result is shared across every learner on that triple and persisted, so subsequent
// visits (by anyone) are cache hits. The daily cap is *asserted* (an over-cap account can't trigger
// fresh spend) but never *incremented* here — grammar generation isn't a graded sentence.
export async function getGrammarReference(params: GetGrammarParams): Promise<GrammarReference> {
  const { user, learnLanguage, guessLanguage, locale } = params

  const cached = await grammarRepository.getReference(learnLanguage, guessLanguage, locale)
  if (cached) {
    return { learnLanguage, guessLanguage, locale, sections: cached.sections }
  }

  assertCanSpend(user)
  await assertSpendEnabled(user)
  await assertWithinDailyCap(user)

  const { sections, usage } = await generateGrammar(getOperatorAnthropicClient(), {
    learnLanguage,
    guessLanguage,
    locale,
  })

  // Snapshot the spend for showback, attributed to this user. Never let a usage-recording failure
  // fail the request.
  recordUsage({
    userId: user.id,
    operation: 'grammar',
    model: SENTENCE_MODEL,
    usage,
  }).catch((err) => console.error('[showback] recordUsage(grammar) failed:', err))

  await grammarRepository.saveReference(learnLanguage, guessLanguage, locale, sections)
  return { learnLanguage, guessLanguage, locale, sections }
}
