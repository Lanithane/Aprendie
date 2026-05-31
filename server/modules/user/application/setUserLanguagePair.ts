import { updateLanguagePair, type LanguagePairPatch } from '../persistence/userRepository'
import { toUserView, type UserView } from '../domain/User'
import { triggerBackgroundRefill } from '../../sentence/application/sentencePool'
import { isLevelCode } from '../../../../shared/levels'
import { type LanguageCode } from '../../../../shared/languages'

export async function setUserLanguagePair(
  userId: string,
  pair: LanguagePairPatch
): Promise<UserView> {
  const updated = await updateLanguagePair(userId, pair)
  // Seed the pool immediately in the background so the first sentence fetch is warm.
  const { learnLanguage, guessLanguage, locale } = updated
  if (learnLanguage && guessLanguage && locale) {
    triggerBackgroundRefill({
      user: updated,
      learnLanguage: learnLanguage as LanguageCode,
      guessLanguage: guessLanguage as LanguageCode,
      locale,
      level: updated.level != null && isLevelCode(updated.level) ? updated.level : undefined,
    })
  }
  return toUserView(updated)
}
