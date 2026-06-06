import * as userRepository from '../persistence/userRepository'
import type { UserRole } from '../domain/User'
import { env } from '../../../env'
import type { UserRow } from '../../../infrastructure/db/schema'
import { getSettings } from '../../settings/application/appSettings'
import { SignupsPausedError } from '../../settings/domain/errors'
import { notifyPendingSignup } from './notifyPendingSignup'

interface GoogleProfileInput {
  googleSub: string
  email: string
  name: string
}

function roleForEmail(email: string): UserRole {
  return env.ADMIN_EMAIL && email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user'
}

export async function findOrCreateGoogleUser(profile: GoogleProfileInput): Promise<UserRow> {
  const desiredRole = roleForEmail(profile.email)
  const existing = await userRepository.findByGoogleSub(profile.googleSub)
  if (existing) {
    // Promote the configured admin's existing row on their next login.
    if (desiredRole === 'admin' && existing.role !== 'admin') {
      return userRepository.updateRole(existing.id, 'admin')
    }
    return existing
  }
  // Brand-new identity: honor the global signup pause, but never lock out the operator.
  const settings = await getSettings()
  if (desiredRole !== 'admin' && settings.signupsPaused) {
    throw new SignupsPausedError()
  }
  const access = desiredRole === 'admin' || settings.autoApproveSignups ? 'approved' : 'pending'
  const created = await userRepository.create({
    email: profile.email,
    name: profile.name,
    googleSub: profile.googleSub,
    role: desiredRole,
    access,
    level: 'starter',
  })
  // Fire-and-forget: only a pending account needs the operator's attention to approve.
  // Not awaited so the login redirect isn't blocked on the email send.
  if (created.access === 'pending') void notifyPendingSignup(created)
  return created
}
