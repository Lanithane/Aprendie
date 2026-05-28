import Anthropic from '@anthropic-ai/sdk'
import { decryptApiKey } from '../crypto/apiKey'
import type { User } from '../db/schema'

export class MissingApiKeyError extends Error {
  constructor() {
    super('User has not provided an Anthropic API key')
    this.name = 'MissingApiKeyError'
  }
}

export function clientForUser(user: User): Anthropic {
  if (!user.encryptedAnthropicKey) {
    throw new MissingApiKeyError()
  }
  const apiKey = decryptApiKey(user.encryptedAnthropicKey)
  return new Anthropic({ apiKey })
}

export const SENTENCE_MODEL = 'claude-haiku-4-5-20251001'
export const CORRECTION_MODEL = 'claude-sonnet-4-6'
