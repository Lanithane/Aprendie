import * as userRepository from '../persistence/userRepository'
import { UserNotFoundError } from '../domain/errors'
import {
  listHistory,
  type ListHistoryParams,
  type HistoryPage,
} from '../../history/application/listHistory'

// Admin-facing read of another user's attempt history. Confirms the target
// exists, then delegates to the history context (application→application).
// Reuses the same paginated `listHistory` the user-facing endpoint uses.
export async function adminGetUserHistory(
  userId: string,
  params: ListHistoryParams
): Promise<HistoryPage> {
  const target = await userRepository.findById(userId)
  if (!target) throw new UserNotFoundError(userId)
  return listHistory(userId, params)
}
