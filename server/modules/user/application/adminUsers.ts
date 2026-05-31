import * as userRepository from '../persistence/userRepository'
import {
  toAdminUserView,
  type AdminUserView,
  type UserRole,
  type AccessState,
} from '../domain/User'
import { UserNotFoundError, LastAdminError } from '../domain/errors'

export async function listUsers(): Promise<AdminUserView[]> {
  const rows = await userRepository.listAll()
  return rows.map(toAdminUserView)
}

export async function setUserRole(id: string, role: UserRole): Promise<AdminUserView> {
  const target = await userRepository.findById(id)
  if (!target) throw new UserNotFoundError(id)
  // Block demoting the last admin so the console can't lock everyone out.
  if (target.role === 'admin' && role !== 'admin') {
    const admins = await userRepository.countAdmins()
    if (admins <= 1) throw new LastAdminError()
  }
  const updated = await userRepository.updateRole(id, role)
  return toAdminUserView(updated)
}

// Approve / deny / block an account's access to the operator key (Epic 12).
export async function setUserAccess(id: string, access: AccessState): Promise<AdminUserView> {
  const target = await userRepository.findById(id)
  if (!target) throw new UserNotFoundError(id)
  const updated = await userRepository.updateAccess(id, access)
  return toAdminUserView(updated)
}

// Hard-deletes a user and their cascaded data. No last-admin guard: the
// configured ADMIN_EMAIL is re-granted admin on next Google login, so deleting
// your own account (the intended way to re-test the new-user onboarding flow)
// is recoverable by signing back in.
export async function adminDeleteUser(id: string): Promise<void> {
  const target = await userRepository.findById(id)
  if (!target) throw new UserNotFoundError(id)
  await userRepository.deleteById(id)
}
