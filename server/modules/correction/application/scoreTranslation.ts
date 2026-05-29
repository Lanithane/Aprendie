import type { Anthropic } from '../../../infrastructure/claude/anthropicClient'
import { CORRECTION_MODEL } from '../../../infrastructure/claude/anthropicClient'
import { extractJsonText } from '../../../infrastructure/claude/responseParser'
import { languageName, type LanguageCode, type LocaleCode } from '../../../../shared/languages'
import type { CorrectionResult } from '../domain/Correction'

interface ScoreInput {
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
  promptText: string
  answerText: string
  userAnswer: string
}

// Language-agnostic system block (kept identical across pairs for prompt caching); the
// specific languages are supplied in the user turn.
const SYSTEM_PROMPT_TEXT = `You are a kind, precise translation tutor. A learner reads a sentence in their LEARN language and types a translation in their GUESS language. The user message tells you both languages. Your job:

1. Decide if the learner's translation is correct (semantic + grammatical equivalence; minor surface variations are OK).
2. Score it 0-100 where 100 = fully correct and natural; lower scores reflect errors and how much the meaning shifted.
3. Provide "correctedAnswer": a natural translation in the GUESS language. This need not match the reference — allow valid alternatives. If the learner was already correct, repeat their answer.
4. List "mistakes": for each error, give the userPhrase (from the learner), the correctPhrase (in the GUESS language), the sourceText (the word(s) in the LEARN sentence they misunderstood), and a TIGHT explanation: ONE sentence, ~12 words max, learner-friendly. No filler.
5. Optional "notes": ONE-sentence grammar or cultural tip if relevant — otherwise omit.

Return ONLY valid JSON, no markdown, no commentary. JSON shape:
{
  "isCorrect": boolean,
  "score": 0-100,
  "correctedAnswer": string,
  "mistakes": [{ "userPhrase": string, "correctPhrase": string, "sourceText": string, "explanation": string }],
  "notes": string | null
}`

export async function scoreTranslation(
  anthropic: Anthropic,
  input: ScoreInput
): Promise<CorrectionResult> {
  const userText = `Learn language: ${languageName(input.learnLanguage)} (${input.learnLanguage})
Guess language: ${languageName(input.guessLanguage)} (${input.guessLanguage})
Regional locale: ${input.locale}
Source sentence (${languageName(input.learnLanguage)}): "${input.promptText}"
Reference translation (${languageName(input.guessLanguage)}): "${input.answerText}"
Learner's translation: "${input.userAnswer}"

Score it now.`

  const resp = await anthropic.messages.create({
    model: CORRECTION_MODEL,
    max_tokens: 1500,
    system: [{ type: 'text', text: SYSTEM_PROMPT_TEXT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userText }],
  })

  const text = extractJsonText(resp, 'correction/score')
  const parsed = JSON.parse(text) as CorrectionResult & { notes?: string | null }
  if (typeof parsed.isCorrect !== 'boolean' || typeof parsed.score !== 'number') {
    throw new Error('[correction/score] invalid response shape')
  }
  return {
    isCorrect: parsed.isCorrect,
    score: parsed.score,
    correctedAnswer: parsed.correctedAnswer,
    mistakes: parsed.mistakes ?? [],
    notes: parsed.notes ?? undefined,
  }
}
