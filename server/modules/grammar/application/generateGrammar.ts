import type { Anthropic } from '../../../infrastructure/claude/anthropicClient'
import { SENTENCE_MODEL } from '../../../infrastructure/claude/anthropicClient'
import { extractJsonText } from '../../../infrastructure/claude/responseParser'
import { toTokenUsage, type TokenUsage } from '../../../infrastructure/claude/pricing'
import { languageName, type LanguageCode, type LocaleCode } from '../../../../shared/languages'
import { normaliseGrammarSections, type GrammarPosSection } from '../domain/GrammarReference'

export interface GeneratedGrammar {
  sections: GrammarPosSection[]
  usage: TokenUsage
}

export interface GrammarGenParams {
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
}

// Byte-static so the cache_control block hits the prompt cache across every (learn, guess, locale)
// triple — the variable parts ride in the user turn, exactly like the sentence generator, translator,
// and lexeme definer. Haiku (SENTENCE_MODEL) keeps this cheap on the operator key; generation is
// rare (the result is cached per triple) so quality at Haiku is acceptable for a reference overview.
const SYSTEM_PROMPT = `You build a grammar reference for a language learner — the "building blocks of this language" overview.

The user message gives you: the LEARN language (the language being studied), the GUESS language (the learner's native language), and a regional locale.

Produce a part-of-speech overview: one section per part of speech, in this order — noun, article, pronoun, adjective, verb, adverb, preposition, conjunction. (Omit a part of speech only if the LEARN language genuinely lacks it, e.g. languages without articles.)

For each section produce:
- "pos": a lowercase canonical key — "noun", "article", "pronoun", "adjective", "verb", "adverb", "preposition", "conjunction".
- "title": a short display label in the GUESS language, e.g. "Nouns".
- "explanation": 1-2 plain sentences in the GUESS language explaining what this part of speech does in the LEARN language and anything notable (gender, agreement, conjugation, word order).
- "members": 5-10 common, everyday members of this part of speech, written in the LEARN language (their dictionary form). For closed classes (articles, pronouns, prepositions, conjunctions) list the real members; for open classes (nouns, verbs, adjectives) give frequent examples.
- "example": one short, simple sentence in the LEARN language that uses a member of this part of speech, plus a natural "translation" in the GUESS language. Keep the sentence beginner-friendly and appropriate to the locale.
- "detail": zero or more drill-down blocks revealing the patterns a learner needs. Each block is { "heading": string (GUESS language), "note"?: string (GUESS language), "rows": [ { "label": string, "value": string } ] }, where each row's "value" is in the LEARN language. Use detail to show, where they apply:
    - verbs: the present-tense conjugation of one regular verb across persons (rows label = person, value = conjugated form).
    - articles: definite (and indefinite) articles by gender and number (rows label = gender/number, value = article).
    - pronouns: the subject pronoun set by person and number.
    - adjectives: a short agreement example (e.g. one adjective in its gender/number forms).
    - nouns: typical plural formation, and gender cues if the language has gender.
  Omit "detail" (use an empty array) for a part of speech that has no useful table.

Rules:
- Member words and example sentences must be in the LEARN language; every explanation, title, heading, note, and translation must be in the GUESS language.
- Use vocabulary, spelling, and idioms typical of the given regional locale.
- Keep it accurate and concise — this is a reference, not a textbook.
- Return ONLY valid JSON, no markdown, no commentary.

JSON shape:
{
  "sections": [
    {
      "pos": string,
      "title": string,
      "explanation": string,
      "members": [string],
      "example": { "text": string, "translation": string },
      "detail": [ { "heading": string, "note"?: string, "rows": [ { "label": string, "value": string } ] } ]
    }
  ]
}`

// Build the Messages-API request for one (learn, guess, locale) triple. The system block is cached;
// only the user turn varies.
function buildMessageParams(params: GrammarGenParams): Anthropic.MessageCreateParamsNonStreaming {
  const { learnLanguage, guessLanguage, locale } = params
  const userText = `Learn language (write members/examples in this): ${languageName(learnLanguage)} (${learnLanguage})
Guess language (write explanations/translations in this): ${languageName(guessLanguage)} (${guessLanguage})
Regional locale: ${locale} — use vocabulary, spelling, and idioms typical of this region.

Generate the grammar reference now.`

  return {
    model: SENTENCE_MODEL,
    max_tokens: 6000,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userText }],
  }
}

export function parseGrammarResponse(
  resp: Anthropic.Message,
  context: string
): GrammarPosSection[] {
  const text = extractJsonText(resp, context)
  const parsed = JSON.parse(text) as { sections?: unknown }
  const sections = normaliseGrammarSections(parsed.sections)
  if (sections.length === 0) throw new Error(`[${context}] no usable sections in response`)
  return sections
}

// Generate the grammar reference for one triple. Caller owns caching, spend gates, and showback.
export async function generateGrammar(
  anthropic: Anthropic,
  params: GrammarGenParams
): Promise<GeneratedGrammar> {
  const resp = await anthropic.messages.create(buildMessageParams(params))
  const sections = parseGrammarResponse(resp, 'grammar/generate')
  return { sections, usage: toTokenUsage(resp.usage) }
}
