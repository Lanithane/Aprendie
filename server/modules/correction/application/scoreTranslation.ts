import type { Anthropic } from '../../../infrastructure/claude/anthropicClient'
import { CORRECTION_MODEL } from '../../../infrastructure/claude/anthropicClient'
import { extractJsonText } from '../../../infrastructure/claude/responseParser'
import type { SpanishLocale } from '../../../../shared/types'
import type { CorrectionResult } from '../domain/Correction'

interface ScoreInput {
  locale: SpanishLocale
  spanish: string
  expectedEnglish: string
  userEnglish: string
}

const SYSTEM_PROMPT_TEXT = `You are a kind, precise Spanish-to-English translation tutor. A learner sees a Spanish sentence and types an English translation. Your job:

1. Decide if the learner's translation is correct (semantic + grammatical equivalence; minor surface variations are OK).
2. Score it 0-100 where 100 = fully correct, natural English; lower scores reflect errors and how much the meaning shifted.
3. Provide "correctedEnglish": a natural English translation. This need not be identical to the expected answer — allow valid alternatives. If the learner was already correct, repeat their answer.
4. List "mistakes": for each error the learner made, give the userPhrase, the correctPhrase, the spanishSource word(s) they misunderstood, and a TIGHT explanation: ONE sentence, ~12 words max, learner-friendly. No filler, no "this is because", just the fact.
5. Optional "notes": ONE-sentence grammar or cultural tip if relevant — otherwise omit.

Return ONLY valid JSON, no markdown, no commentary. JSON shape:
{
  "isCorrect": boolean,
  "score": 0-100,
  "correctedEnglish": string,
  "mistakes": [{ "userPhrase": string, "correctPhrase": string, "spanishSource": string, "explanation": string }],
  "notes": string | null
}`

export async function scoreTranslation(
  anthropic: Anthropic,
  input: ScoreInput
): Promise<CorrectionResult> {
  const userText = `Locale: ${input.locale}
Spanish source: "${input.spanish}"
Expected English (reference): "${input.expectedEnglish}"
Learner's translation: "${input.userEnglish}"

Score it now.`

  const resp = await anthropic.messages.create({
    model: CORRECTION_MODEL,
    max_tokens: 1500,
    system: [
      { type: 'text', text: SYSTEM_PROMPT_TEXT, cache_control: { type: 'ephemeral' } },
    ],
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
    correctedEnglish: parsed.correctedEnglish,
    mistakes: parsed.mistakes ?? [],
    notes: parsed.notes ?? undefined,
  }
}
