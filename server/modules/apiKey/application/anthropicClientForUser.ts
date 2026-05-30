import {
  buildAnthropicClient,
  type Anthropic,
} from '../../../infrastructure/claude/anthropicClient'
import { decrypt } from '../../../infrastructure/crypto/encryption'
import type { UserRow } from '../../../infrastructure/db/schema'
import { MissingApiKeyError } from '../domain/errors'

export function anthropicClientForUser(user: UserRow): Anthropic {
  if (!user.encryptedAnthropicKey) throw new MissingApiKeyError()
  const apiKey = decrypt(user.encryptedAnthropicKey, user.id)
  // `apiKey` is a JS string and cannot be zeroed from memory (the SDK retains it too),
  // so we instead minimize its lifetime: it is never attached to `req`/`user`, only
  // handed to the SDK here, and the local reference drops when this function returns.
  return buildAnthropicClient(apiKey)
}
