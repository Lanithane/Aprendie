import type { UserRow } from '../../../infrastructure/db/schema'
import type { LanguageCode, LocaleCode } from '../../../../shared/languages'
import type { LevelCode } from '../../../../shared/levels'
import { anthropicClientForUser } from '../../apiKey/application/anthropicClientForUser'
import * as sentenceRepository from '../persistence/sentenceRepository'
import { generateSentenceBatch } from './generateSentenceBatch'
import { toSentenceView, type SentenceView } from '../domain/Sentence'

const REFILL_THRESHOLD = 3

interface GetNextSentenceInput {
  user: UserRow
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
  level?: LevelCode
}

export async function getNextSentence(input: GetNextSentenceInput): Promise<SentenceView> {
  const filter = {
    userId: input.user.id,
    learnLanguage: input.learnLanguage,
    guessLanguage: input.guessLanguage,
    locale: input.locale,
    level: input.level,
  }

  const count = await sentenceRepository.countUnconsumed(filter)
  if (count < REFILL_THRESHOLD) {
    const anthropic = await anthropicClientForUser(input.user)
    const batch = await generateSentenceBatch(anthropic, {
      learnLanguage: input.learnLanguage,
      guessLanguage: input.guessLanguage,
      locale: input.locale,
      level: input.level,
    })
    await sentenceRepository.insertBatch(
      batch.map((s) => ({
        userId: input.user.id,
        learnLanguage: input.learnLanguage,
        guessLanguage: input.guessLanguage,
        locale: input.locale,
        promptText: s.promptText,
        answerText: s.answerText,
        level: s.level,
        wordBreakdown: s.wordBreakdown,
      }))
    )
  }

  const sentence = await sentenceRepository.takeNextUnconsumed(filter)
  if (!sentence) {
    throw new Error('sentence_cache empty after refill')
  }
  return toSentenceView(sentence)
}
