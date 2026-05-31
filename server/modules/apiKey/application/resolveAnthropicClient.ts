import {
  buildAnthropicClient,
  type Anthropic,
} from '../../../infrastructure/claude/anthropicClient'
import { decrypt } from '../../../infrastructure/crypto/encryption'
import { env } from '../../../env'
import type { UserRow } from '../../../infrastructure/db/schema'
import { MissingApiKeyError } from '../domain/errors'

// Resolves the Anthropic client a request spends against. Under the operator-key model
// (Epic 12) every approved user spends against the single operator-supplied key, so when
// `OPERATOR_ANTHROPIC_KEY` is configured it is used regardless of the user's own stored key.
// When it is unset (e.g. early local dev) we fall back to the user's own encrypted key so
// local work keeps functioning; a hybrid "use my own key" override can later flip this order.
export function resolveAnthropicClient(user: UserRow): Anthropic {
  if (env.OPERATOR_ANTHROPIC_KEY) return buildAnthropicClient(env.OPERATOR_ANTHROPIC_KEY)
  if (!user.encryptedAnthropicKey) throw new MissingApiKeyError()
  const apiKey = decrypt(user.encryptedAnthropicKey, user.id)
  // `apiKey` is a JS string and cannot be zeroed from memory (the SDK retains it too),
  // so we instead minimize its lifetime: it is never attached to `req`/`user`, only
  // handed to the SDK here, and the local reference drops when this function returns.
  return buildAnthropicClient(apiKey)
}
