import type Anthropic from '@anthropic-ai/sdk'
import { SENTENCE_MODEL } from './client'
import type { SpanishLocale } from '../../shared/types'

const LOCALE_NOTES: Record<SpanishLocale, string> = {
  'es-MX': 'Latin American Spanish, Mexican vocabulary and idioms (e.g. "carro" rather than "coche", "platicar", "ahorita").',
  'es-ES': 'Castilian Spanish from Spain (e.g. "vosotros" forms acceptable, "coche", "ordenador", "vale"). Use European Spanish phrasing.',
  'es-AR': 'Rioplatense Spanish from Argentina (voseo: "vos tenés", "che", "boludo" in casual register, Italianate intonation flavor).',
}

const BATCH_SIZE = 10

interface GeneratedSentence {
  spanish: string
  expectedEnglish: string
  difficulty: number
  grammarFocus: string
}

export async function generateSentenceBatch(
  anthropic: Anthropic,
  locale: SpanishLocale
): Promise<GeneratedSentence[]> {
  const systemBlock = {
    type: 'text' as const,
    text: `You generate Spanish learning sentences for an intermediate learner.

Output requirements:
- Exactly ${BATCH_SIZE} distinct sentences
- Mix difficulty 1-5 across the batch
- Vary the grammar focus (preterite, imperfect, subjunctive, ser-vs-estar, por-vs-para, prepositions, pronouns, idioms)
- Keep each sentence 5-15 words
- Return ONLY valid JSON, no markdown, no commentary

JSON shape:
{
  "sentences": [
    { "spanish": string, "expectedEnglish": string, "difficulty": 1-5, "grammarFocus": string }
  ]
}`,
    cache_control: { type: 'ephemeral' as const },
  }

  const userText = `Locale: ${locale}
Regional flavor: ${LOCALE_NOTES[locale]}

Generate ${BATCH_SIZE} sentences now.`

  const resp = await anthropic.messages.create({
    model: SENTENCE_MODEL,
    max_tokens: 2000,
    system: [systemBlock],
    messages: [{ role: 'user', content: userText }],
  })

  const block = resp.content[0]
  if (block.type !== 'text') throw new Error('[claude/sentences] unexpected non-text response')
  const text = block.text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  const parsed = JSON.parse(text) as { sentences?: GeneratedSentence[] }
  if (!Array.isArray(parsed.sentences) || parsed.sentences.length === 0) {
    throw new Error('[claude/sentences] missing or empty sentences[] in response')
  }
  return parsed.sentences
}
