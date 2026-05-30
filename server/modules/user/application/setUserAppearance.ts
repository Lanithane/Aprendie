import * as userRepository from '../persistence/userRepository'
import type { AppearancePatch } from '../persistence/userRepository'
import { toUserView, type UserView } from '../domain/User'

// Persists a user's appearance prefs (theme id and/or light/dark mode). Only the provided
// fields are written, so the client can update either independently.
export async function setUserAppearance(userId: string, patch: AppearancePatch): Promise<UserView> {
  const updated = await userRepository.updateAppearance(userId, patch)
  return toUserView(updated)
}
