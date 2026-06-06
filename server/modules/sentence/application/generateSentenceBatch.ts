import type { Anthropic } from '../../../infrastructure/claude/anthropicClient'
import { SENTENCE_MODEL } from '../../../infrastructure/claude/anthropicClient'
import { extractJsonText } from '../../../infrastructure/claude/responseParser'
import { toTokenUsage, type TokenUsage } from '../../../infrastructure/claude/pricing'
import {
  languageName,
  type LanguageCode,
  type LocaleCode,
  type WordGender,
  type WordModifier,
  type WordToken,
} from '../../../../shared/languages'
import { LEVELS, isLevelCode, levelByCode, type LevelCode } from '../../../../shared/levels'
import { CATEGORY_DOMAINS } from '../../../../shared/categories'
import type { GeneratedSentence } from '../domain/Sentence'

export const BATCH_SIZE = 10

// Rotating content domains (the shared category registry). Difficulty is governed entirely by the
// level rubric below; these steer only WHAT a batch is about, so the same domain yields a starter
// "I eat bread" and a C2 restaurant-review sentence alike. We shuffle and pass a different spread on
// every call so successive pools stop converging on the same high-frequency phrases (the starter
// pool was the worst offender — endless "hola"/"gracias"). Deliberately kept OUT of the cached
// system block: variety must change per call, the system prompt must stay byte-identical to keep its
// cache hit. When a learner pins a topic we instead pass that single domain (see buildSentence...).

// Shuffle and take a spread sized to the batch: roughly one domain per sentence, but capped so a
// full 10-sentence batch still touches ~7 distinct areas without forcing rigid one-per-sentence.
function pickThemes(count: number): string[] {
  const wanted = Math.min(CATEGORY_DOMAINS.length, Math.max(2, Math.min(count, 7)))
  const pool = [...CATEGORY_DOMAINS]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, wanted)
}

const LEVEL_RUBRIC = LEVELS.map(
  (l) => `- ${l.code}${l.cefr ? ` (CEFR ${l.cefr})` : ''}: ${l.blurb}`
).join('\n')

const SHARED_PROMPT_INTRO = `You generate language-learning sentences for a learner.

The user message gives you: the LEARN language (write the sentences in this language), the GUESS language (the language the learner translates into), a regional locale, and a target difficulty level (or an instruction to mix levels).

Difficulty levels — use these exact codes for the "level" field:
${LEVEL_RUBRIC}

Output requirements:
- Output exactly the number of distinct sentences requested in the user message.
- "promptText" is the sentence in the LEARN language; "answerText" is a natural translation in the GUESS language.
- Match the requested difficulty level, or vary across levels if asked to mix. Set "level" to the matching code.
- "theme": echo back which everyday domain (from the list given in the user message) this sentence is based on, copied verbatim as the matching string.
- Make each sentence natural and idiomatic for the given regional locale.
- Variety matters: across a batch, vary the grammatical subject (don't open most sentences with the same word or pronoun), mix sentence types — statements, questions, requests, exclamations — wherever the difficulty level allows, and reach for different vocabulary instead of recycling the same handful of words. No batch should read like a list of near-identical greetings or textbook filler.
- "wordBreakdown": one entry per meaningful word in promptText (skip pure punctuation). Decompose EVERY inflected word into the changes that derive it from its dictionary form. Each entry has:
    "surface" = the word exactly as it appears in promptText,
    "lemma" = its dictionary / base form, in the LEARN language,
    "partOfSpeech" = a short, common part-of-speech label in the GUESS language (e.g. "noun", "verb", "adjective", "adverb", "pronoun", "preposition", "article", "conjunction"). Use everyday grammar terms — avoid fine-grained technical subcategories like "proper noun" or "clitic pronoun",
    "modifiers" = an array describing how the surface word differs from the lemma. If the surface word IS the dictionary/base form (identical to the lemma apart from capitalization), use an empty array []. Otherwise include one entry per morphological change — suffixes, prefixes, AND stem changes (e.g. the e→ie diphthong that turns "tener" into "tienes"). Each entry:
        "segment" = the affix or changed letters as they appear (e.g. "-es", "-as", "ie"),
        "note" = a brief explanation of that change's grammatical function, written in the GUESS language (e.g. "2nd person singular, present tense", "stem change e→ie", "feminine plural").`

// One prompt for every level: each token always carries a one-word gloss in the guess language,
// so the meaning is in the data for the results screen to reveal once the challenge is over.
// Immersion is a UI concern, not a generation one — during practice the client hides the gloss
// above Starter. Language-agnostic, so the cached system block stays byte-identical across every
// language pair AND every level.
const SYSTEM_PROMPT = `${SHARED_PROMPT_INTRO}
- For each wordBreakdown entry, include a "gloss" field: a single word (or very short phrase) in the GUESS language that gives the core meaning of that word. This is the one place the guess language may express meaning — keep it to one word where possible.
- For words that carry grammatical gender in the LEARN language (chiefly nouns, but also a gendered article, adjective, or pronoun where the gender is unambiguous), include a "gender" field set to exactly "masculine", "feminine", or "neuter". OMIT the field entirely for words with no grammatical gender and for genderless languages such as English.
- "lemma" and modifier "segment" still stay in the LEARN language.
- Return ONLY valid JSON, no markdown, no commentary.

JSON shape:
{
  "sentences": [
    {
      "promptText": string,
      "answerText": string,
      "level": string,
      "theme": string,
      "wordBreakdown": [ { "surface": string, "lemma": string, "partOfSpeech": string, "gloss": string, "gender"?: "masculine" | "feminine" | "neuter", "modifiers": [ { "segment": string, "note": string } ] } ]
    }
  ]
}`

interface GenerateParams {
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
  level?: LevelCode
  // A pinned everyday-domain (a `CATEGORY_DOMAINS` string). When set, the whole batch is forced onto
  // this one domain instead of a shuffled spread, so a learner drilling a topic gets more of it.
  category?: string
}

// The generated sentences plus the token usage of the call, so the caller can record showback.
export interface GeneratedBatch {
  sentences: GeneratedSentence[]
  usage: TokenUsage
}

interface RawSentence {
  promptText?: string
  answerText?: string
  level?: string
  theme?: string
  wordBreakdown?: WordToken[]
}

const GENDERS: readonly WordGender[] = ['masculine', 'feminine', 'neuter']

// Coerce a model-supplied token into the WordToken shape, guarding the `modifiers` array
// (the model may omit it for base-form words or hand back malformed entries).
function normalizeToken(raw: Partial<WordToken>): WordToken {
  const rawModifiers = Array.isArray(raw.modifiers) ? raw.modifiers : []
  const modifiers: WordModifier[] = rawModifiers
    .filter((m): m is WordModifier => Boolean(m?.segment))
    .map((m) => ({ segment: m.segment, note: m.note ?? '' }))
  const token: WordToken = {
    surface: raw.surface ?? '',
    lemma: raw.lemma ?? '',
    partOfSpeech: raw.partOfSpeech ?? '',
    modifiers,
  }
  if (raw.gloss) token.gloss = raw.gloss
  if (raw.gender && GENDERS.includes(raw.gender)) token.gender = raw.gender
  return token
}

function normalize(raw: RawSentence, requestedLevel?: LevelCode): GeneratedSentence {
  const level = raw.level && isLevelCode(raw.level) ? raw.level : (requestedLevel ?? 'b1')
  const theme = raw.theme?.trim()
  return {
    promptText: (raw.promptText ?? '').trim(),
    answerText: (raw.answerText ?? '').trim(),
    level,
    theme: theme ? theme : null,
    wordBreakdown: Array.isArray(raw.wordBreakdown)
      ? raw.wordBreakdown.filter((t) => t?.surface).map(normalizeToken)
      : [],
  }
}

// Build the Messages-API request body for one sentence-generation call. Factored out so BOTH the
// synchronous cold-start path (generateSentenceBatch) and the half-price background path
// (batchClient, Epic 22) submit byte-identical requests — same cached system block, same shape — so
// the prompt cache and the corpus dedup behave the same regardless of which path generated a row.
export function buildSentenceMessageParams(
  params: GenerateParams,
  count: number = BATCH_SIZE
): Anthropic.MessageCreateParamsNonStreaming {
  const { learnLanguage, guessLanguage, locale, level, category } = params
  const levelLine = level
    ? `All ${count} sentences at difficulty level "${level}" (${levelByCode(level)?.name ?? level}).`
    : 'Mix difficulty levels across the batch, from starter up to advanced.'

  // A pinned topic forces the whole batch onto that single domain (the learner is drilling it);
  // otherwise spread a freshly shuffled selection so successive pools stay varied.
  const themeLine = category
    ? `Base ${count === 1 ? 'this sentence' : `all ${count} sentences`} on this everyday domain: ${category}.`
    : count === 1
      ? `Base this sentence on one of these everyday domains: ${pickThemes(count).join(', ')}.`
      : `Spread the ${count} sentences across these everyday domains — aim for a different one each and don't cluster on a single topic: ${pickThemes(count).join('; ')}.`

  const userText = `Learn language (write the sentences in this): ${languageName(learnLanguage)} (${learnLanguage})
Guess language (translate into this): ${languageName(guessLanguage)} (${guessLanguage})
Regional locale: ${locale} — use vocabulary, spelling, and idioms typical of this region.
${levelLine}
${themeLine}

Generate ${count} sentences now.`

  return {
    model: SENTENCE_MODEL,
    max_tokens: 8000,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userText }],
  }
}

// Parse a sentence-generation response into usable GeneratedSentences. Shared by the synchronous
// path and the batch collector (which hands in a Message retrieved from batch results). `context`
// flows into error/parse messages; `level` is the requested level used to fill any missing per-
// sentence level. Throws when nothing usable comes back so callers can skip/log the result.
export function parseSentenceResponse(
  resp: Anthropic.Message,
  context: string,
  level?: LevelCode
): GeneratedSentence[] {
  const text = extractJsonText(resp, context)
  const parsed = JSON.parse(text) as { sentences?: RawSentence[] }
  if (!Array.isArray(parsed.sentences) || parsed.sentences.length === 0) {
    throw new Error(`[${context}] missing or empty sentences[] in response`)
  }
  const sentences = parsed.sentences
    .map((s) => normalize(s, level))
    .filter((s) => s.promptText.length > 0 && s.answerText.length > 0)
  if (sentences.length === 0) {
    throw new Error(`[${context}] no usable sentences in response`)
  }
  return sentences
}

export async function generateSentenceBatch(
  anthropic: Anthropic,
  params: GenerateParams,
  count: number = BATCH_SIZE
): Promise<GeneratedBatch> {
  const resp = await anthropic.messages.create(buildSentenceMessageParams(params, count))
  const sentences = parseSentenceResponse(resp, 'sentence/generate', params.level)
  return { sentences, usage: toTokenUsage(resp.usage) }
}
