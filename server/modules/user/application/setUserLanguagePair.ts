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
  // Warm the shared corpus for the chosen slice in the background so the first sentence fetch is
  // warm — but ONLY once the level is known. Onboarding sets the pair before the level, so firing
  // here without a concrete level used to generate a mixed-level batch whose off-level half was
  // stranded (Epic 20 leak fix). With no level yet, `setUserLevel` warms the slice instead.
  const { learnLanguage, guessLanguage, locale, level } = updated
  if (learnLanguage && guessLanguage && locale && level != null && isLevelCode(level)) {
    triggerBackgroundRefill({
      user: updated,
      learnLanguage: learnLanguage as LanguageCode,
      guessLanguage: guessLanguage as LanguageCode,
      locale,
      level,
    })
  }
  return toUserView(updated)
}
