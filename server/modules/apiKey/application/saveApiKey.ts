import { encrypt } from '../../../infrastructure/crypto/encryption'
import * as userRepository from '../../user/persistence/userRepository'
import { validateApiKey } from './validateApiKey'

export async function saveApiKey(userId: string, apiKey: string): Promise<void> {
  await validateApiKey(apiKey)
  await userRepository.updateEncryptedApiKey(userId, encrypt(apiKey))
}

export async function removeApiKey(userId: string): Promise<void> {
  await userRepository.updateEncryptedApiKey(userId, null)
}
