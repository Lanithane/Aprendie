import type Anthropic from '@anthropic-ai/sdk'

type Message = Anthropic.Message

export function extractJsonText(resp: Message, context: string): string {
  const block = resp.content[0]
  if (!block || block.type !== 'text') {
    throw new Error(`[${context}] unexpected non-text response`)
  }
  return block.text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
}
