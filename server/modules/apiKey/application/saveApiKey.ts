import { encrypt } from '../../../infrastructure/crypto/encryption'
import * as userRepository from '../../user/persistence/userRepository'
import { validateApiKey } from './validateApiKey'

export async function saveApiKey(userId: string, apiKey: string): Promise<void> {
  await validateApiKey(apiKey)
  // Bind the ciphertext to the owning user (HKDF salt + GCM AAD) — see encryption.ts.
  await userRepository.updateEncryptedApiKey(userId, encrypt(apiKey, userId))
}

export async function removeApiKey(userId: string): Promise<void> {
  await userRepository.updateEncryptedApiKey(userId, null)
}
