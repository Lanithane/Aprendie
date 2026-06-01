import type { Anthropic } from '../../../infrastructure/claude/anthropicClient'
import { CORRECTION_MODEL } from '../../../infrastructure/claude/anthropicClient'
import { extractJsonText } from '../../../infrastructure/claude/responseParser'
import { toTokenUsage, type TokenUsage } from '../../../infrastructure/claude/pricing'
import { languageName, type LanguageCode, type LocaleCode } from '../../../../shared/languages'
import { scoreToGrade } from '../../../../shared/grades'
import type { CorrectionResult, Naturalness } from '../domain/Correction'

// The graded result plus the token usage of the call, so the caller can record showback.
export interface ScoredTranslation {
  result: CorrectionResult
  usage: TokenUsage
}

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
2. Score it 0-100 where 100 = fully correct and natural. IMPORTANT scoring rules:
   - Punctuation differences (missing period, wrong apostrophe style) and capitalisation alone NEVER reduce the score. If the only differences are surface punctuation/caps, score as if they match perfectly.
   - Semantic errors, wrong words, grammar mistakes, and missing/extra meaning DO reduce the score.
   - A word-for-word literal translation that conveys the correct meaning but sounds unnatural in the GUESS language scores at most 96 (accurate but stiff).
3. Return "naturalness": "natural" if the translation sounds fluent and idiomatic in the GUESS language; "stiff" if it is accurate but sounds word-for-word, overly literal, or unnatural.
4. Provide "correctedAnswer": a natural translation in the GUESS language. This need not match the reference. Allow valid alternatives. If the learner was already correct, repeat their answer.
5. List "mistakes": for each error, give the userPhrase (from the learner), the correctPhrase (in the GUESS language), the sourceText (the word(s) in the LEARN sentence they misunderstood), and a TIGHT explanation: ONE sentence, ~12 words max, learner-friendly. No filler.
6. Optional "notes": ONE-sentence grammar or cultural tip if it genuinely helps. Otherwise omit.

VOICE for every learner-facing string ("explanation" and "notes"): speak like a warm, wise, elderly mentor talking to a friend. Plain, encouraging, human. NEVER use an em dash or en dash (— or –); write short sentences or use a comma, period, or "so" instead. Avoid AI-assistant phrasing: no "it's worth noting", "keep in mind", "notice how", "simply", "delve", "let's", "great job", or hedging. Just say the helpful thing plainly and kindly.

Return ONLY valid JSON, no markdown, no commentary. JSON shape:
{
  "isCorrect": boolean,
  "score": 0-100,
  "naturalness": "natural" | "stiff",
  "correctedAnswer": string,
  "mistakes": [{ "userPhrase": string, "correctPhrase": string, "sourceText": string, "explanation": string }],
  "notes": string | null
}`

// If the model says stiff but the score is in A+ territory, cap to top of A band.
const A_PLUS_THRESHOLD = 97
const A_BAND_CAP = 96

export async function scoreTranslation(
  anthropic: Anthropic,
  input: ScoreInput
): Promise<ScoredTranslation> {
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
  const parsed = JSON.parse(text) as {
    isCorrect: boolean
    score: number
    naturalness?: string
    correctedAnswer: string
    mistakes?: CorrectionResult['mistakes']
    notes?: string | null
  }
  if (typeof parsed.isCorrect !== 'boolean' || typeof parsed.score !== 'number') {
    throw new Error('[correction/score] invalid response shape')
  }

  const naturalness: Naturalness =
    parsed.naturalness === 'stiff' || parsed.naturalness === 'natural'
      ? parsed.naturalness
      : 'natural'

  // Cap accurate-but-stiff answers out of A+ territory.
  const score =
    naturalness === 'stiff' && parsed.score >= A_PLUS_THRESHOLD ? A_BAND_CAP : parsed.score

  return {
    result: {
      isCorrect: parsed.isCorrect,
      score,
      grade: scoreToGrade(score),
      naturalness,
      correctedAnswer: parsed.correctedAnswer,
      mistakes: parsed.mistakes ?? [],
      notes: parsed.notes ?? undefined,
    },
    usage: toTokenUsage(resp.usage),
  }
}
