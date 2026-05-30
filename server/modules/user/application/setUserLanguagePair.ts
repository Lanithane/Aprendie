import { updateLanguagePair, type LanguagePairPatch } from '../persistence/userRepository'
import { toUserView, type UserView } from '../domain/User'

// The pair is shape- and semantics-validated at the controller boundary (zod + isValidLanguagePair),
// so this stays thin like setUserLevel — persist and project.
export async function setUserLanguagePair(
  userId: string,
  pair: LanguagePairPatch
): Promise<UserView> {
  const updated = await updateLanguagePair(userId, pair)
  return toUserView(updated)
}
