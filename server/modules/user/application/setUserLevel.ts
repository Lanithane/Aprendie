import type { LevelCode } from '../../../../shared/levels'
import * as userRepository from '../persistence/userRepository'
import { toUserView, type UserView } from '../domain/User'

export async function setUserLevel(userId: string, level: LevelCode | null): Promise<UserView> {
  const updated = await userRepository.updateLevel(userId, level)
  return toUserView(updated)
}
