import { buildAnthropicClient } from '../../../infrastructure/claude/anthropicClient'
import { InvalidApiKeyError } from '../domain/errors'

// Pings Anthropic with a 1-token request to confirm the key works.
// Throws InvalidApiKeyError on any failure. Never returns or logs the key.
export async function validateApiKey(apiKey: string): Promise<void> {
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
