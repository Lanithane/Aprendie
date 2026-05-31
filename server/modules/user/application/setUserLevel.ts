import type { LevelCode } from '../../../../shared/levels'
import * as userRepository from '../persistence/userRepository'
import { toUserView, type UserView } from '../domain/User'
import { triggerBackgroundRefill } from '../../sentence/application/sentencePool'
import { type LanguageCode } from '../../../../shared/languages'

export async function setUserLevel(userId: string, level: LevelCode | null): Promise<UserView> {
  const updated = await userRepository.updateLevel(userId, level)
  const { learnLanguage, guessLanguage, locale } = updated
  if (learnLanguage && guessLanguage && locale) {
    triggerBackgroundRefill({
      user: updated,
      learnLanguage: learnLanguage as LanguageCode,
      guessLanguage: guessLanguage as LanguageCode,
      locale,
      level: level ?? undefined,
    })
  }
  return toUserView(updated)
}
