import type Anthropic from '@anthropic-ai/sdk'
import { CORRECTION_MODEL } from './client'
import type { SpanishLocale } from '../../shared/types'

export interface CorrectionResult {
  isCorrect: boolean
  score: number
  correctedEnglish: string
  mistakes: Array<{
    userPhrase: string
    correctPhrase: string
    spanishSource: string
    explanation: string
  }>
  notes?: string
}

interface CorrectionInput {
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

export async function correctTranslation(
  anthropic: Anthropic,
  input: CorrectionInput
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
      {
        type: 'text',
        text: SYSTEM_PROMPT_TEXT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userText }],
  })

  const block = resp.content[0]
  if (block.type !== 'text') throw new Error('[claude/correction] unexpected non-text response')
  const text = block.text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  const parsed = JSON.parse(text) as CorrectionResult & { notes?: string | null }
  if (typeof parsed.isCorrect !== 'boolean' || typeof parsed.score !== 'number') {
    throw new Error('[claude/correction] invalid response shape')
  }
  return {
    isCorrect: parsed.isCorrect,
    score: parsed.score,
    correctedEnglish: parsed.correctedEnglish,
    mistakes: parsed.mistakes ?? [],
    notes: parsed.notes ?? undefined,
  }
}
