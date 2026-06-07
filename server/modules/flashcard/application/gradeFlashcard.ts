import type { UserRow } from '../../../infrastructure/db/schema'
import {
  getOperatorAnthropicClient,
  SENTENCE_MODEL,
} from '../../../infrastructure/claude/anthropicClient'
import { toTokenUsage } from '../../../infrastructure/claude/pricing'
import { extractJsonText } from '../../../infrastructure/claude/responseParser'
import { assertCanSpend } from '../../user/application/access'
import { assertSpendEnabled } from '../../settings/application/appSettings'
import { assertWithinDailyCap, recordGradedSentence } from '../../usage/application/dailyCap'
import { recordStreakActivity } from '../../user/application/recordStreakActivity'
import { recordUsage } from '../../showback/application/recordUsage'
import { recordSeenWords } from '../../palabradex/application/recordSeenWords'
import * as flashcardRepository from '../persistence/flashcardRepository'
import type { FlashcardGradeView } from '../domain/Flashcard'
import type { LanguageCode } from '../../../../shared/languages'

export interface GradeFlashcardInput {
  user: UserRow
  flashcardId: string
  answer: string
}

export class FlashcardNotFoundError extends Error {
  constructor() {
    super('flashcard not found')
    this.name = 'FlashcardNotFoundError'
  }
}

function normalise(s: string): string {
  return s
    .normalize('NFC')
    .toLowerCase()
    .trim()
    .replace(/^to\s+/, '') // "to have" → "have" for lenient gloss matching
    .replace(/[.,!?;:]+$/, '') // strip trailing punctuation
}

// Fast path: if the user's answer is an exact match (or very close) to the gloss, skip Claude.
function isExactMatch(answer: string, gloss: string): boolean {
  const a = normalise(answer)
  const g = normalise(gloss)
  if (a === g) return true
  // Accept if the answer matches any slash-separated alternative in the gloss ("have / possess")
  return gloss
    .split('/')
    .map((part) => normalise(part))
    .some((part) => a === part)
}

const GRADE_SYSTEM_PROMPT = `You evaluate a language-learner's flash-card answer.
The learner sees a single word in the learn language and must type its core meaning in the guess language.
A correct answer captures the core meaning; minor spelling variations, synonyms, and alternate phrasings count as correct.
An incorrect answer is missing the core meaning entirely.

Return ONLY valid JSON:
{ "isCorrect": boolean, "score": number, "acceptedGloss": string, "note": string | null }
- score: 0-100 (100 = perfect, 0 = completely wrong)
- acceptedGloss: the canonical one-to-three-word answer in the guess language
- note: a brief corrective tip if wrong (null when correct)`

export async function gradeFlashcard(input: GradeFlashcardInput): Promise<FlashcardGradeView> {
  assertCanSpend(input.user)
  await assertSpendEnabled(input.user)

  const capped = input.user.role !== 'admin'
  const capCheck = capped ? assertWithinDailyCap(input.user) : Promise.resolve()
  const cardLookup = flashcardRepository.findById(input.flashcardId)
  cardLookup.catch(() => {})

  await capCheck
  const card = await cardLookup
  if (!card) throw new FlashcardNotFoundError()

  let gradeResult: { isCorrect: boolean; score: number; acceptedGloss: string; note?: string }

  if (isExactMatch(input.answer, card.gloss)) {
    // Short-circuit: no Claude call needed for an obvious match.
    gradeResult = { isCorrect: true, score: 100, acceptedGloss: card.gloss }
  } else {
    const anthropic = getOperatorAnthropicClient()
    const userText = `Card: "${card.lemma}" (${card.partOfSpeech}) in ${card.learnLanguage}
Canonical meaning: "${card.gloss}"
Learner answered: "${input.answer}"

Grade now.`

    const resp = await anthropic.messages.create({
      model: SENTENCE_MODEL,
      max_tokens: 256,
      system: [{ type: 'text', text: GRADE_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userText }],
    })

    const usage = toTokenUsage(resp.usage)
    recordUsage({
      userId: input.user.id,
      operation: 'flashcard_grade',
      model: SENTENCE_MODEL,
      usage,
    }).catch((err) => console.error('[showback] recordUsage(flashcard_grade) failed:', err))

    const text = extractJsonText(resp, 'flashcard/grade')
    const parsed = JSON.parse(text) as {
      isCorrect?: boolean
      score?: number
      acceptedGloss?: string
      note?: string | null
    }
    gradeResult = {
      isCorrect: Boolean(parsed.isCorrect),
      score:
        typeof parsed.score === 'number'
          ? Math.max(0, Math.min(100, parsed.score))
          : parsed.isCorrect
            ? 100
            : 0,
      acceptedGloss: parsed.acceptedGloss?.trim() || card.gloss,
      note: parsed.note ?? undefined,
    }
  }

  // Fold the result into Palabradex (shared mastery model with sentence practice).
  const seenAt = new Date()
  const [, dailyUsage, streak] = await Promise.all([
    recordSeenWords({
      userId: input.user.id,
      learnLanguage: card.learnLanguage as LanguageCode,
      wordBreakdown: [
        {
          surface: card.lemma,
          lemma: card.lemma,
          partOfSpeech: card.partOfSpeech,
          gloss: card.gloss,
          modifiers: [],
          ...(card.gender ? { gender: card.gender } : {}),
        },
      ],
      mistakes: gradeResult.isCorrect ? [] : [{ sourceText: card.lemma }],
      seenAt,
    }),
    recordGradedSentence(input.user),
    // Advance the consecutive-day streak (shared with sentence practice); snapshot rides back so the
    // indicator pops on advance without a refetch.
    recordStreakActivity(input.user),
  ])

  return {
    flashcardId: card.id,
    isCorrect: gradeResult.isCorrect,
    score: gradeResult.score,
    acceptedGloss: gradeResult.acceptedGloss,
    note: gradeResult.note,
    lemma: card.lemma,
    gloss: card.gloss,
    example: card.example ?? '',
    exampleTranslation: card.exampleTranslation ?? '',
    dailyUsage,
    streak,
  }
}
