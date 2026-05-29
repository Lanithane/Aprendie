import { buildAnthropicClient } from '../../../infrastructure/claude/anthropicClient'
import { encrypt } from '../../../infrastructure/crypto/encryption'
import * as userRepository from '../../user/persistence/userRepository'
import { InvalidApiKeyError } from '../domain/errors'

async function validateAgainstAnthropic(apiKey: string): Promise<void> {
  try {
    const client = buildAnthropicClient(apiKey)
    await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'ping' }],
    })
  } catch (err) {
    throw new InvalidApiKeyError(err instanceof Error ? err.message : 'unknown error')
  }
}

export async function saveApiKey(userId: string, apiKey: string): Promise<void> {
  await validateAgainstAnthropic(apiKey)
  await userRepository.updateEncryptedApiKey(userId, encrypt(apiKey))
}

export async function removeApiKey(userId: string): Promise<void> {
  await userRepository.updateEncryptedApiKey(userId, null)
}
