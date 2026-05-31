import * as userRepository from '../persistence/userRepository'
import type { UserRole } from '../domain/User'
import { env } from '../../../env'
import type { UserRow } from '../../../infrastructure/db/schema'

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
  return userRepository.create({
    email: profile.email,
    name: profile.name,
    googleSub: profile.googleSub,
    role: desiredRole,
    // The operator (admin) is auto-approved; every other new account starts pending
    // and must be approved before it can spend the operator key (Epic 12).
    access: desiredRole === 'admin' ? 'approved' : 'pending',
    level: 'starter',
  })
}
