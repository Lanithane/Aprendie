import {
  buildAnthropicClient,
  type Anthropic,
} from '../../../infrastructure/claude/anthropicClient'
import { decrypt, encrypt, isCurrentEncoding } from '../../../infrastructure/crypto/encryption'
import * as userRepository from '../../user/persistence/userRepository'
import type { UserRow } from '../../../infrastructure/db/schema'
import { MissingApiKeyError } from '../domain/errors'

export async function anthropicClientForUser(user: UserRow): Promise<Anthropic> {
  if (!user.encryptedAnthropicKey) throw new MissingApiKeyError()
  const stored = user.encryptedAnthropicKey
  const apiKey = decrypt(stored, user.id)
  // Self-healing migration: upgrade legacy / rotated blobs to the current scheme on
  // read. Best-effort — a failed re-encrypt must never break the user's request.
  if (!isCurrentEncoding(stored)) {
    try {
      await userRepository.updateEncryptedApiKey(user.id, encrypt(apiKey, user.id))
    } catch (err) {
      console.error(`[apiKey] failed to upgrade key encoding for user ${user.id}:`, err)
    }
  }
  // `apiKey` is a JS string and cannot be zeroed from memory (the SDK retains it too),
  // so we instead minimize its lifetime: it is never attached to `req`/`user`, only
  // handed to the SDK here, and the local reference drops when this function returns.
  return buildAnthropicClient(apiKey)
}
