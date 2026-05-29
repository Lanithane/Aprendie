import type { UserRow, SentenceRow } from '../../../infrastructure/db/schema'
import type { SpanishLocale } from '../../../../shared/types'
import { anthropicClientForUser } from '../../apiKey/application/anthropicClientForUser'
import * as sentenceRepository from '../../sentence/persistence/sentenceRepository'
import { scoreTranslation } from './scoreTranslation'
import type { CorrectionView } from '../domain/Correction'

interface CorrectInput {
  user: UserRow
  sentenceId: string
  userEnglish: string
}

export class SentenceNotFoundError extends Error {
  constructor() {
    super('sentence not found')
    this.name = 'SentenceNotFoundError'
  }
}

export async function correctTranslation(input: CorrectInput): Promise<CorrectionView> {
  const sentence: SentenceRow | null = await sentenceRepository.findForUser(
    input.user.id,
    input.sentenceId
  )
  if (!sentence) throw new SentenceNotFoundError()

  const anthropic = anthropicClientForUser(input.user)
  const result = await scoreTranslation(anthropic, {
    locale: sentence.locale as SpanishLocale,
    spanish: sentence.spanish,
    expectedEnglish: sentence.expectedEnglish,
    userEnglish: input.userEnglish,
  })

  return {
    sentenceId: sentence.id,
    spanish: sentence.spanish,
    expectedEnglish: sentence.expectedEnglish,
    userEnglish: input.userEnglish,
    ...result,
  }
}
