import type { UserRow } from '../../../infrastructure/db/schema'
import type { SpanishLocale } from '../../../../shared/types'
import { anthropicClientForUser } from '../../apiKey/application/anthropicClientForUser'
import * as sentenceRepository from '../persistence/sentenceRepository'
import { generateSentenceBatch } from './generateSentenceBatch'
import { toSentenceView, type SentenceView } from '../domain/Sentence'

const REFILL_THRESHOLD = 3

interface GetNextSentenceInput {
  user: UserRow
  locale: SpanishLocale
  difficulty?: number
}

export async function getNextSentence(input: GetNextSentenceInput): Promise<SentenceView> {
  const filter = { userId: input.user.id, locale: input.locale, difficulty: input.difficulty }

  const count = await sentenceRepository.countUnconsumed(filter)
  if (count < REFILL_THRESHOLD) {
    const anthropic = anthropicClientForUser(input.user)
    const batch = await generateSentenceBatch(anthropic, input.locale, input.difficulty)
    await sentenceRepository.insertBatch(
      batch.map((s) => ({
        userId: input.user.id,
        locale: input.locale,
        spanish: s.spanish,
        expectedEnglish: s.expectedEnglish,
        difficulty: s.difficulty,
        grammarFocus: s.grammarFocus,
      }))
    )
  }

  const sentence = await sentenceRepository.takeNextUnconsumed(filter)
  if (!sentence) {
    throw new Error('sentence_cache empty after refill')
  }
  return toSentenceView(sentence)
}
