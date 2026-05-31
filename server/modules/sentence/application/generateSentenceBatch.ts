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

// Rotating content domains. Difficulty is governed entirely by the level rubric below; these
// steer only WHAT a batch is about, so the same domain yields a starter "I eat bread" and a
// C2 restaurant-review sentence alike. We shuffle and pass a different spread on every call so
// successive pools stop converging on the same high-frequency phrases (the starter pool was the
// worst offender — endless "hola"/"gracias"). Deliberately kept OUT of the cached system block:
// variety must change per call, the system prompt must stay byte-identical to keep its cache hit.
const THEME_DOMAINS = [
  'greetings and introductions',
  'family and relationships',
  'food, cooking and eating out',
  'numbers, time and dates',
  'weather and the seasons',
  'home, rooms and furniture',
  'work, study and school',
  'travel, directions and transport',
  'shopping and money',
  'health, the body and the doctor',
  'clothes and appearance',
  'animals and nature',
  'hobbies and free time',
  'feelings, opinions and personality',
  'technology, phones and the internet',
  'city life and the neighbourhood',
  'sports and exercise',
  'art, music, film and books',
  'daily routine and chores',
  'plans, dreams and the future',
  'holidays, festivals and celebrations',
  'the natural world and the environment',
]

// Shuffle and take a spread sized to the batch: roughly one domain per sentence, but capped so a
// full 10-sentence batch still touches ~7 distinct areas without forcing rigid one-per-sentence.
function pickThemes(count: number): string[] {
  const wanted = Math.min(THEME_DOMAINS.length, Math.max(2, Math.min(count, 7)))
  const pool = [...THEME_DOMAINS]
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

  const themes = pickThemes(count)
  const themeLine =
    count === 1
      ? `Base this sentence on one of these everyday domains: ${themes.join(', ')}.`
      : `Spread the ${count} sentences across these everyday domains — aim for a different one each and don't cluster on a single topic: ${themes.join('; ')}.`

  const userText = `Learn language (write the sentences in this): ${languageName(learnLanguage)} (${learnLanguage})
Guess language (translate into this): ${languageName(guessLanguage)} (${guessLanguage})
Regional locale: ${locale} — use vocabulary, spelling, and idioms typical of this region.
${levelLine}
${themeLine}

Generate ${count} sentences now.`

  const resp = await anthropic.messages.create({
    model: SENTENCE_MODEL,
    max_tokens: 8000,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
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
