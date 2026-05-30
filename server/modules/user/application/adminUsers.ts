import * as userRepository from '../persistence/userRepository'
import { toAdminUserView, type AdminUserView, type UserRole } from '../domain/User'
import { UserNotFoundError, LastAdminError } from '../domain/errors'
import { decrypt } from '../../../infrastructure/crypto/encryption'
import { validateApiKey } from '../../apiKey/application/validateApiKey'

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

export async function adminRevokeUserKey(id: string): Promise<void> {
  const target = await userRepository.findById(id)
  if (!target) throw new UserNotFoundError(id)
  await userRepository.updateEncryptedApiKey(id, null)
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

export interface RevalidateResult {
  ok: boolean
  reason?: string
}

// Decrypts the user's key server-side, pings Anthropic, and reports ok/fail.
// The plaintext key is never returned to (or logged for) the admin.
export async function adminRevalidateUserKey(id: string): Promise<RevalidateResult> {
  const target = await userRepository.findById(id)
  if (!target) throw new UserNotFoundError(id)
  if (!target.encryptedAnthropicKey) {
    return { ok: false, reason: 'No API key configured' }
  }
  // validateApiKey throws InvalidApiKeyError (message already descriptive) on failure.
  try {
    await validateApiKey(decrypt(target.encryptedAnthropicKey, target.id))
    return { ok: true }
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'Validation failed' }
  }
}
