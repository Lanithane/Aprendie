import type { Anthropic } from '../../../infrastructure/claude/anthropicClient'
import { SENTENCE_MODEL } from '../../../infrastructure/claude/anthropicClient'
import { extractJsonText } from '../../../infrastructure/claude/responseParser'
import {
  languageName,
  type LanguageCode,
  type LocaleCode,
  type WordModifier,
  type WordToken,
} from '../../../../shared/languages'
import { LEVELS, isLevelCode, levelByCode, type LevelCode } from '../../../../shared/levels'
import type { GeneratedSentence } from '../domain/Sentence'

const BATCH_SIZE = 10

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
- Make each sentence natural and idiomatic for the given regional locale.
- "wordBreakdown": one entry per meaningful word in promptText (skip pure punctuation). Decompose EVERY inflected word into the changes that derive it from its dictionary form. Each entry has:
    "surface" = the word exactly as it appears in promptText,
    "lemma" = its dictionary / base form, in the LEARN language,
    "partOfSpeech" = a short, common part-of-speech label in the GUESS language (e.g. "noun", "verb", "adjective", "adverb", "pronoun", "preposition", "article", "conjunction"). Use everyday grammar terms — avoid fine-grained technical subcategories like "proper noun" or "clitic pronoun",
    "modifiers" = an array describing how the surface word differs from the lemma. If the surface word IS the dictionary/base form (identical to the lemma apart from capitalization), use an empty array []. Otherwise include one entry per morphological change — suffixes, prefixes, AND stem changes (e.g. the e→ie diphthong that turns "tener" into "tienes"). Each entry:
        "segment" = the affix or changed letters as they appear (e.g. "-es", "-as", "ie"),
        "note" = a brief explanation of that change's grammatical function, written in the GUESS language (e.g. "2nd person singular, present tense", "stem change e→ie", "feminine plural").`

// Standard prompt: immersive — no word meanings ever revealed. Language-agnostic so the
// cached system block is byte-identical across every language pair.
const SYSTEM_PROMPT_STANDARD = `${SHARED_PROMPT_INTRO}
- CRITICAL: never give the meaning or translation of any word. The learner must recall meanings unaided. The GUESS language appears ONLY as grammatical metadata — the "partOfSpeech" label and modifier "note" fields — never as a gloss. "lemma" and modifier "segment" stay in the LEARN language.
- Return ONLY valid JSON, no markdown, no commentary.

JSON shape:
{
  "sentences": [
    {
      "promptText": string,
      "answerText": string,
      "level": string,
      "wordBreakdown": [ { "surface": string, "lemma": string, "partOfSpeech": string, "modifiers": [ { "segment": string, "note": string } ] } ]
    }
  ]
}`

// Starter prompt: adds a one-word gloss per token in the guess language. Only used when the
// entire batch is at the starter level — mixed batches always use the standard prompt.
const SYSTEM_PROMPT_STARTER = `${SHARED_PROMPT_INTRO}
- For each wordBreakdown entry, include a "gloss" field: a single word (or very short phrase) in the GUESS language that gives the core meaning of that word. This is the one place the guess language may express meaning — keep it to one word where possible.
- "lemma" and modifier "segment" still stay in the LEARN language.
- Return ONLY valid JSON, no markdown, no commentary.

JSON shape:
{
  "sentences": [
    {
      "promptText": string,
      "answerText": string,
      "level": string,
      "wordBreakdown": [ { "surface": string, "lemma": string, "partOfSpeech": string, "gloss": string, "modifiers": [ { "segment": string, "note": string } ] } ]
    }
  ]
}`

interface GenerateParams {
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
  level?: LevelCode
}

interface RawSentence {
  promptText?: string
  answerText?: string
  level?: string
  wordBreakdown?: WordToken[]
}

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
  return token
}

function normalize(raw: RawSentence, requestedLevel?: LevelCode): GeneratedSentence {
  const level = raw.level && isLevelCode(raw.level) ? raw.level : (requestedLevel ?? 'b1')
  return {
    promptText: (raw.promptText ?? '').trim(),
    answerText: (raw.answerText ?? '').trim(),
    level,
    wordBreakdown: Array.isArray(raw.wordBreakdown)
      ? raw.wordBreakdown.filter((t) => t?.surface).map(normalizeToken)
      : [],
  }
}

export async function generateSentenceBatch(
  anthropic: Anthropic,
  params: GenerateParams,
  count: number = BATCH_SIZE
): Promise<GeneratedSentence[]> {
  const { learnLanguage, guessLanguage, locale, level } = params
  const levelLine = level
    ? `All ${count} sentences at difficulty level "${level}" (${levelByCode(level)?.name ?? level}).`
    : 'Mix difficulty levels across the batch, from starter up to advanced.'

  const userText = `Learn language (write the sentences in this): ${languageName(learnLanguage)} (${learnLanguage})
Guess language (translate into this): ${languageName(guessLanguage)} (${guessLanguage})
Regional locale: ${locale} — use vocabulary, spelling, and idioms typical of this region.
${levelLine}

Generate ${count} sentences now.`

  const systemPrompt = level === 'starter' ? SYSTEM_PROMPT_STARTER : SYSTEM_PROMPT_STANDARD
  const resp = await anthropic.messages.create({
    model: SENTENCE_MODEL,
    max_tokens: 8000,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userText }],
  })

  const text = extractJsonText(resp, 'sentence/generate')
  const parsed = JSON.parse(text) as { sentences?: RawSentence[] }
  if (!Array.isArray(parsed.sentences) || parsed.sentences.length === 0) {
    throw new Error('[sentence/generate] missing or empty sentences[] in response')
  }
  const sentences = parsed.sentences
    .map((s) => normalize(s, level))
    .filter((s) => s.promptText.length > 0 && s.answerText.length > 0)
  if (sentences.length === 0) {
    throw new Error('[sentence/generate] no usable sentences in response')
  }
  return sentences
}
