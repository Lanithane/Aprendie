import * as userRepository from '../persistence/userRepository'
import * as usageRepository from '../../usage/persistence/usageRepository'
import { getSettings } from '../../settings/application/appSettings'
import {
  toAdminUserView,
  type AdminUserView,
  type UserRole,
  type AccessState,
} from '../domain/User'
import type { UserRow } from '../../../infrastructure/db/schema'
import { UserNotFoundError, LastAdminError } from '../domain/errors'

export async function listUsers(): Promise<AdminUserView[]> {
  const [rows, settings, usedByUser] = await Promise.all([
    userRepository.listAll(),
    getSettings(),
    usageRepository.countTodayForAll(),
  ])
  return rows.map((row) =>
    toAdminUserView(row, {
      usedToday: usedByUser.get(row.id) ?? 0,
      globalCap: settings.dailyGradedCap,
    })
  )
}

// Re-projects a single user after a mutation, refreshing their usage + the global cap so
// the returned view stays consistent with the list.
async function viewFor(row: UserRow): Promise<AdminUserView> {
  const [settings, usedToday] = await Promise.all([
    getSettings(),
    usageRepository.countToday(row.id),
  ])
  return toAdminUserView(row, { usedToday, globalCap: settings.dailyGradedCap })
}

export async function setUserRole(id: string, role: UserRole): Promise<AdminUserView> {
  const target = await userRepository.findById(id)
  if (!target) throw new UserNotFoundError(id)
  // Block demoting the last admin so the console can't lock everyone out.
  if (target.role === 'admin' && role !== 'admin') {
    const admins = await userRepository.countAdmins()
    if (admins <= 1) throw new LastAdminError()
  }
  return viewFor(await userRepository.updateRole(id, role))
}

// Approve / deny / block an account's access to the operator key.
export async function setUserAccess(id: string, access: AccessState): Promise<AdminUserView> {
  const target = await userRepository.findById(id)
  if (!target) throw new UserNotFoundError(id)
  return viewFor(await userRepository.updateAccess(id, access))
}

// Set or clear a temporary full uncap (a future timestamp lifts the cap until it passes;
// null re-caps the account immediately).
export async function setUserCapExempt(id: string, until: Date | null): Promise<AdminUserView> {
  const target = await userRepository.findById(id)
  if (!target) throw new UserNotFoundError(id)
  return viewFor(await userRepository.updateCapExempt(id, until))
}

// Set or clear a per-user daily cap override (null falls back to the global cap).
export async function setUserCapOverride(id: string, cap: number | null): Promise<AdminUserView> {
  const target = await userRepository.findById(id)
  if (!target) throw new UserNotFoundError(id)
  return viewFor(await userRepository.updateCapOverride(id, cap))
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
