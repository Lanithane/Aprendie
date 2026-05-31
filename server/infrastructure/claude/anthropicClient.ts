import Anthropic from '@anthropic-ai/sdk'
import { env } from '../../env'

export const SENTENCE_MODEL = 'claude-haiku-4-5-20251001'
export const CORRECTION_MODEL = 'claude-sonnet-4-6'

export function buildAnthropicClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey })
}

export function getOperatorAnthropicClient(): Anthropic {
  if (!env.OPERATOR_ANTHROPIC_KEY) throw new Error('OPERATOR_ANTHROPIC_KEY is not configured')
  return buildAnthropicClient(env.OPERATOR_ANTHROPIC_KEY)
}

export type { Anthropic }
