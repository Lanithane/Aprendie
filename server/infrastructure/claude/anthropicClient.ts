import Anthropic from '@anthropic-ai/sdk'

export const SENTENCE_MODEL = 'claude-haiku-4-5-20251001'
export const CORRECTION_MODEL = 'claude-sonnet-4-6'

export function buildAnthropicClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey })
}

export type { Anthropic }
