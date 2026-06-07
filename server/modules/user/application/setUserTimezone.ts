import * as userRepository from '../persistence/userRepository'
import { toUserView, type UserView } from '../domain/User'

// Persists the learner's IANA timezone, captured from the browser on load. The grade path uses it
// to bucket each activity into the right local day for the streak.
export async function setUserTimezone(userId: string, timezone: string): Promise<UserView> {
  const updated = await userRepository.updateTimezone(userId, timezone)
  return toUserView(updated)
}
