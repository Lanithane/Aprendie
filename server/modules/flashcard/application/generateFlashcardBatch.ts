import type { Anthropic } from '../../../infrastructure/claude/anthropicClient'
import { SENTENCE_MODEL } from '../../../infrastructure/claude/anthropicClient'
import { extractJsonText } from '../../../infrastructure/claude/responseParser'
import { toTokenUsage, type TokenUsage } from '../../../infrastructure/claude/pricing'
import {
  languageName,
  type LanguageCode,
  type LocaleCode,
  type WordGender,
} from '../../../../shared/languages'
import type { DeckDef } from '../../../../shared/decks'
import type { GeneratedFlashcard } from '../domain/Flashcard'

export interface GeneratedDeck {
  cards: GeneratedFlashcard[]
  usage: TokenUsage
}

interface RawCard {
  lemma?: string
  gloss?: string
  partOfSpeech?: string
  gender?: string
  example?: string
  exampleTranslation?: string
}

const GENDERS: readonly WordGender[] = ['masculine', 'feminine', 'neuter']

function normaliseCard(raw: RawCard): GeneratedFlashcard | null {
  const lemma = raw.lemma?.trim()
  const gloss = raw.gloss?.trim()
  const partOfSpeech = raw.partOfSpeech?.trim()
  if (!lemma || !gloss || !partOfSpeech) return null
  const card: GeneratedFlashcard = {
    lemma,
    gloss,
    partOfSpeech,
    example: raw.example?.trim() ?? '',
    exampleTranslation: raw.exampleTranslation?.trim() ?? '',
  }
  if (raw.gender && GENDERS.includes(raw.gender as WordGender)) {
    card.gender = raw.gender as WordGender
  }
  return card
}

// System prompt byte-identical across every (pair, locale, deck) so the cache hit is maximised.
const SYSTEM_PROMPT = `You generate flash-card word entries for a language learner.

The user message gives you: the LEARN language (the language being studied), the GUESS language (the learner's native language), a regional locale, and a word list to cover.

For each word produce:
- "lemma": the word in its dictionary/base form in the LEARN language.
- "gloss": the most common translation in the GUESS language, kept to 1-3 words (the canonical answer the learner will type).
- "partOfSpeech": a short English grammar label — "conjunction", "pronoun", "verb", "noun", "number", "adjective", "adverb", "preposition", "article", or "other".
- "gender": "masculine" | "feminine" | "neuter" — include only for words that carry grammatical gender in the LEARN language (mainly nouns and gendered adjectives/pronouns). Omit entirely for genderless languages or genderless words.
- "example": a short, natural sentence using this word in the LEARN language that is appropriate to the given locale.
- "exampleTranslation": a natural translation of the example sentence in the GUESS language.

Rules:
- Cover every word in the spec; do not add extra words.
- The gloss must be in the GUESS language; the lemma and example must be in the LEARN language.
- Use vocabulary, spelling, and idioms typical of the given regional locale.
- Return ONLY valid JSON, no markdown, no commentary.

JSON shape:
{
  "cards": [
    { "lemma": string, "gloss": string, "partOfSpeech": string, "gender"?: "masculine" | "feminine" | "neuter", "example": string, "exampleTranslation": string }
  ]
}`

export interface DeckParams {
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
  deck: DeckDef
}

// Build the Messages-API request for one deck slice. Factored out so the cold-start path and the
// seed script's Batch API path submit byte-identical requests — same cached system block, same shape.
export function buildFlashcardMessageParams(
  params: DeckParams
): Anthropic.MessageCreateParamsNonStreaming {
  const { learnLanguage, guessLanguage, locale, deck } = params
  const userText = `Learn language (write lemma/example in this): ${languageName(learnLanguage)} (${learnLanguage})
Guess language (write gloss/exampleTranslation in this): ${languageName(guessLanguage)} (${guessLanguage})
Regional locale: ${locale} — use vocabulary, spelling, and idioms typical of this region.
Deck: ${deck.label}

Produce cards for: ${deck.spec}

Generate up to ${deck.size} cards now.`

  return {
    model: SENTENCE_MODEL,
    max_tokens: 4000,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userText }],
  }
}

export function parseFlashcardResponse(
  resp: Anthropic.Message,
  context: string
): GeneratedFlashcard[] {
  const text = extractJsonText(resp, context)
  const parsed = JSON.parse(text) as { cards?: RawCard[] }
  if (!Array.isArray(parsed.cards) || parsed.cards.length === 0) {
    throw new Error(`[${context}] missing or empty cards[] in response`)
  }
  const cards = parsed.cards.map(normaliseCard).filter((c): c is GeneratedFlashcard => c !== null)
  if (cards.length === 0) throw new Error(`[${context}] no usable cards in response`)
  return cards
}

export async function generateFlashcardBatch(
  anthropic: Anthropic,
  params: DeckParams
): Promise<GeneratedDeck> {
  const resp = await anthropic.messages.create(buildFlashcardMessageParams(params))
  const cards = parseFlashcardResponse(resp, `flashcard/generate/${params.deck.id}`)
  return { cards, usage: toTokenUsage(resp.usage) }
}
