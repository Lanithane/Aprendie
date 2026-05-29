import {
  buildAnthropicClient,
  type Anthropic,
} from '../../../infrastructure/claude/anthropicClient'
import { decrypt } from '../../../infrastructure/crypto/encryption'
import type { UserRow } from '../../../infrastructure/db/schema'
import { MissingApiKeyError } from '../domain/errors'

export function anthropicClientForUser(user: UserRow): Anthropic {
  if (!user.encryptedAnthropicKey) throw new MissingApiKeyError()
  return buildAnthropicClient(decrypt(user.encryptedAnthropicKey))
}
