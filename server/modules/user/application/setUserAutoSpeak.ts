import * as userRepository from '../persistence/userRepository'
import type { AutoSpeakPatch } from '../persistence/userRepository'
import { toUserView, type UserView } from '../domain/User'

// Persists a user's auto-speak prefs (whether new sentences play on their own and the delay before
// they do). Only the provided fields are written, so the client can update either independently.
export async function setUserAutoSpeak(userId: string, patch: AutoSpeakPatch): Promise<UserView> {
  const updated = await userRepository.updateAutoSpeak(userId, patch)
  return toUserView(updated)
}
