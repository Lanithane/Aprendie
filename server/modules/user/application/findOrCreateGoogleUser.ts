import * as userRepository from '../persistence/userRepository'
import type { UserRow } from '../../../infrastructure/db/schema'

interface GoogleProfileInput {
  googleSub: string
  email: string
  name: string
}

export async function findOrCreateGoogleUser(profile: GoogleProfileInput): Promise<UserRow> {
  const existing = await userRepository.findByGoogleSub(profile.googleSub)
  if (existing) return existing
  return userRepository.create({
    email: profile.email,
    name: profile.name,
    googleSub: profile.googleSub,
  })
}
