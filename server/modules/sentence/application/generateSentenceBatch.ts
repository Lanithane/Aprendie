import type { Anthropic } from '../../../infrastructure/claude/anthropicClient'
import { SENTENCE_MODEL } from '../../../infrastructure/claude/anthropicClient'
import { extractJsonText } from '../../../infrastructure/claude/responseParser'
import {
  languageName,
  type LanguageCode,
  type LocaleCode,
  type WordToken,
} from '../../../../shared/languages'
import { LEVELS, isLevelCode, levelByCode, type LevelCode } from '../../../../shared/levels'
import type { GeneratedSentence } from '../domain/Sentence'

const BATCH_SIZE = 10

const LEVEL_RUBRIC = LEVELS.map(
  (l) => `- ${l.code}${l.cefr ? ` (CEFR ${l.cefr})` : ''}: ${l.blurb}`
).join('\n')

// Language-agnostic so the cached system block is byte-identical across every language
// pair. Everything pair-specific lives in the user turn.
const SYSTEM_PROMPT_TEXT = `You generate language-learning sentences for a learner.

The user message gives you: the LEARN language (write the sentences in this language), the GUESS language (the language the learner translates into), a regional locale, and a target difficulty level (or an instruction to mix levels).

Difficulty levels — use these exact codes for the "level" field:
${LEVEL_RUBRIC}

Output requirements:
- Exactly ${BATCH_SIZE} distinct sentences.
- "promptText" is the sentence in the LEARN language; "answerText" is a natural translation in the GUESS language.
- Match the requested difficulty level, or vary across levels if asked to mix. Set "level" to the matching code.
- Make each sentence natural and idiomatic for the given regional locale.
- "grammarFocus": a short tag in the GUESS language for the main grammar point; choose points that matter pedagogically for the LEARN language.
- "wordBreakdown": one entry per meaningful word in promptText (skip pure punctuation), each with:
    "surface" = the word exactly as it appears,
    "lemma" = its dictionary / root form,
    "gloss" = its meaning in the GUESS language,
    "partOfSpeech" = a short part-of-speech label in the GUESS language.
- Return ONLY valid JSON, no markdown, no commentary.

JSON shape:
{
  "sentences": [
    {
      "promptText": string,
      "answerText": string,
      "level": string,
      "grammarFocus": string,
      "wordBreakdown": [ { "surface": string, "lemma": string, "gloss": string, "partOfSpeech": string } ]
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
  grammarFocus?: string
  wordBreakdown?: WordToken[]
}

function normalize(raw: RawSentence, requestedLevel?: LevelCode): GeneratedSentence {
  const level = raw.level && isLevelCode(raw.level) ? raw.level : (requestedLevel ?? 'b1')
  return {
    promptText: (raw.promptText ?? '').trim(),
    answerText: (raw.answerText ?? '').trim(),
    level,
    grammarFocus: raw.grammarFocus ?? '',
    wordBreakdown: Array.isArray(raw.wordBreakdown) ? raw.wordBreakdown : [],
  }
}

export async function generateSentenceBatch(
  anthropic: Anthropic,
  params: GenerateParams
): Promise<GeneratedSentence[]> {
  const { learnLanguage, guessLanguage, locale, level } = params
  const levelLine = level
    ? `All ${BATCH_SIZE} sentences at difficulty level "${level}" (${levelByCode(level)?.name ?? level}).`
    : 'Mix difficulty levels across the batch, from starter up to advanced.'

  const userText = `Learn language (write the sentences in this): ${languageName(learnLanguage)} (${learnLanguage})
Guess language (translate into this): ${languageName(guessLanguage)} (${guessLanguage})
Regional locale: ${locale} — use vocabulary, spelling, and idioms typical of this region.
${levelLine}

Generate ${BATCH_SIZE} sentences now.`

  const resp = await anthropic.messages.create({
    model: SENTENCE_MODEL,
    max_tokens: 8000,
    system: [{ type: 'text', text: SYSTEM_PROMPT_TEXT, cache_control: { type: 'ephemeral' } }],
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
