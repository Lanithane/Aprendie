import type { Anthropic } from '../../../infrastructure/claude/anthropicClient'
import { SENTENCE_MODEL } from '../../../infrastructure/claude/anthropicClient'
import { extractJsonText } from '../../../infrastructure/claude/responseParser'
import type { SpanishLocale } from '../../../../shared/types'
import type { GeneratedSentence } from '../domain/Sentence'

const BATCH_SIZE = 10

const LOCALE_NOTES: Record<SpanishLocale, string> = {
  'es-MX':
    'Latin American Spanish, Mexican vocabulary and idioms (e.g. "carro" rather than "coche", "platicar", "ahorita").',
  'es-ES':
    'Castilian Spanish from Spain (e.g. "vosotros" forms acceptable, "coche", "ordenador", "vale"). Use European Spanish phrasing.',
  'es-AR':
    'Rioplatense Spanish from Argentina (voseo: "vos tenés", "che", "boludo" in casual register, Italianate intonation flavor).',
}

const SYSTEM_PROMPT_TEXT = `You generate Spanish learning sentences for an intermediate learner.

Output requirements:
- Exactly ${BATCH_SIZE} distinct sentences
- Each sentence 5-15 words
- Vary the grammar focus (preterite, imperfect, subjunctive, ser-vs-estar, por-vs-para, prepositions, pronouns, idioms)
- difficulty is an int 1-5 where 1 = beginner-friendly, 5 = challenging idiomatic / subjunctive / complex syntax
- Return ONLY valid JSON, no markdown, no commentary

JSON shape:
{
  "sentences": [
    { "spanish": string, "expectedEnglish": string, "difficulty": 1-5, "grammarFocus": string }
  ]
}`

export async function generateSentenceBatch(
  anthropic: Anthropic,
  locale: SpanishLocale,
  targetDifficulty?: number
): Promise<GeneratedSentence[]> {
  const userText = `Locale: ${locale}
Regional flavor: ${LOCALE_NOTES[locale]}
${
  targetDifficulty
    ? `All ${BATCH_SIZE} sentences should be at difficulty ${targetDifficulty}/5.`
    : `Mix difficulty 1-5 across the batch.`
}

Generate ${BATCH_SIZE} sentences now.`

  const resp = await anthropic.messages.create({
    model: SENTENCE_MODEL,
    max_tokens: 2000,
    system: [
      { type: 'text', text: SYSTEM_PROMPT_TEXT, cache_control: { type: 'ephemeral' } },
    ],
    messages: [{ role: 'user', content: userText }],
  })

  const text = extractJsonText(resp, 'sentence/generate')
  const parsed = JSON.parse(text) as { sentences?: GeneratedSentence[] }
  if (!Array.isArray(parsed.sentences) || parsed.sentences.length === 0) {
    throw new Error('[sentence/generate] missing or empty sentences[] in response')
  }
  return parsed.sentences
}
