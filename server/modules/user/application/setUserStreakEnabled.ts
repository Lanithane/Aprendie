import * as userRepository from '../persistence/userRepository'
import { toUserView, type UserView } from '../domain/User'

// Persists the streak opt-out toggle. False freezes streak tracking (recordStreakActivity skips all
// reads/writes); true (the default for a null column) resumes it.
export async function setUserStreakEnabled(userId: string, enabled: boolean): Promise<UserView> {
  const updated = await userRepository.updateStreakEnabled(userId, enabled)
  return toUserView(updated)
}
