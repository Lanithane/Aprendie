import type { Anthropic } from '../../../infrastructure/claude/anthropicClient'
import { CORRECTION_MODEL } from '../../../infrastructure/claude/anthropicClient'
import { extractJsonText } from '../../../infrastructure/claude/responseParser'
import { toTokenUsage, type TokenUsage } from '../../../infrastructure/claude/pricing'
import { languageName, type LanguageCode, type LocaleCode } from '../../../../shared/languages'
import { scoreToGrade } from '../../../../shared/grades'
import type { CorrectionResult, Naturalness } from '../domain/Correction'
import { applyScoreFloor } from '../domain/scoreFloor'

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
2. Score it 0-100 where 100 = fully correct and natural. Be LENIENT and reward what the learner got right. IMPORTANT scoring rules:
   - Punctuation differences (missing period, wrong apostrophe style) and capitalisation alone NEVER reduce the score. If the only differences are surface punctuation/caps, score as if they match perfectly.
   - Meaning-preserving variation is NOT an error. Accept synonyms, common colloquialisms, and idiomatic paraphrases that a fluent speaker of the GUESS language (in this regional locale) would understand the same way in this context. For example, in English "I find that" for "I think that", "a lot of" for "many", or contractions vs. full forms carry the same meaning, so do not reduce the score for them. Apply the equivalent judgement in whatever the GUESS language is. This also applies to full-clause restructuring of longer sentences: if the learner reorders clauses or rephrases a multi-part sentence while fully preserving the meaning, score it in the A/B range (≥ 80). A faithful paraphrase of a long sentence is a sign of understanding, not an error.
   - Semantic errors, genuinely wrong words, grammar mistakes that change meaning, and missing/extra meaning DO reduce the score.
   - Reserve the lowest scores (0-49) for translations that are essentially entirely wrong: the meaning is lost, most words are incorrect, or the sentence is unintelligible. If the learner got part of the sentence right, the score MUST stay above 49 and reflect the share they conveyed correctly. A single wrong or missing word in an otherwise-correct sentence is a minor deduction, not a failure.
   - A word-for-word literal translation that conveys the correct meaning but sounds unnatural in the GUESS language scores at most 96 (accurate but stiff).
3. Return "naturalness": "natural" if the translation sounds fluent and idiomatic in the GUESS language; "stiff" if it is accurate but sounds word-for-word, overly literal, or unnatural.
4. Provide "correctedAnswer": a natural translation in the GUESS language when the learner's answer could be improved. This need not match the reference; allow valid alternatives. If the learner's answer is already fully correct and natural, so you would only repeat it back verbatim, return an empty string "" instead of repeating it.
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

// The Messages-API request body for one grade. Shared by the blocking and streaming paths so both
// send the byte-identical cached system block.
function buildScoreParams(input: ScoreInput): Anthropic.MessageCreateParamsNonStreaming {
  const userText = `Learn language: ${languageName(input.learnLanguage)} (${input.learnLanguage})
Guess language: ${languageName(input.guessLanguage)} (${input.guessLanguage})
Regional locale: ${input.locale}
Source sentence (${languageName(input.learnLanguage)}): "${input.promptText}"
Reference translation (${languageName(input.guessLanguage)}): "${input.answerText}"
Learner's translation: "${input.userAnswer}"

Score it now.`

  return {
    model: CORRECTION_MODEL,
    max_tokens: 1500,
    system: [{ type: 'text', text: SYSTEM_PROMPT_TEXT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userText }],
  }
}

// Turn the model's raw JSON text into the authoritative scored result: validate the shape, apply the
// stiff cap and the F-band floor, and map to a letter grade. Shared by both paths so a streamed grade
// is scored identically to a blocking one.
function finalizeScore(rawJson: string, userAnswer: string, usage: TokenUsage): ScoredTranslation {
  const parsed = JSON.parse(rawJson) as {
    isCorrect: boolean
    score: number
    naturalness?: string
    correctedAnswer?: string
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

  const mistakes = parsed.mistakes ?? []

  // The model returns "" when the learner's answer was already perfect, so it skips re-emitting the
  // whole sentence — output tokens are the dominant grading latency, and that's pure waste on the
  // happy path. Fall back to the learner's own answer so downstream (the diff display, the score
  // floor below) always has the correct text to work with.
  const correctedAnswer = parsed.correctedAnswer?.trim() ? parsed.correctedAnswer : userAnswer

  // Cap accurate-but-stiff answers out of A+ territory.
  const cappedScore =
    naturalness === 'stiff' && parsed.score >= A_PLUS_THRESHOLD ? A_BAND_CAP : parsed.score

  // Deterministic backstop: a majority-correct answer can't fall into the F band,
  // even if the model ignored that rule in its scoring.
  const score = applyScoreFloor(cappedScore, correctedAnswer, mistakes)

  return {
    result: {
      isCorrect: parsed.isCorrect,
      score,
      grade: scoreToGrade(score),
      naturalness,
      correctedAnswer,
      mistakes,
      notes: parsed.notes ?? undefined,
    },
    usage,
  }
}

export async function scoreTranslation(
  anthropic: Anthropic,
  input: ScoreInput
): Promise<ScoredTranslation> {
  const resp = await anthropic.messages.create(buildScoreParams(input))
  return finalizeScore(
    extractJsonText(resp, 'correction/score'),
    input.userAnswer,
    toTokenUsage(resp.usage)
  )
}

// Streaming grade: forwards each model text delta to `onDelta` as it arrives (so the caller can push
// a live preview to the client), then finalizes identically to scoreTranslation once the model is
// done. `signal` lets the caller abort the model call if the learner navigates away mid-grade.
export async function scoreTranslationStream(
  anthropic: Anthropic,
  input: ScoreInput,
  onDelta: (delta: string) => void,
  signal?: AbortSignal
): Promise<ScoredTranslation> {
  const stream = anthropic.messages.stream(buildScoreParams(input), { signal })
  stream.on('text', (delta) => onDelta(delta))
  const msg = await stream.finalMessage()
  return finalizeScore(
    extractJsonText(msg, 'correction/score'),
    input.userAnswer,
    toTokenUsage(msg.usage)
  )
}
