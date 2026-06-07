import type { LanguageCode, LocaleCode, WordGender } from '../../../../shared/languages'
import type { FlashcardRow } from '../../../infrastructure/db/schema'
import type { DailyUsageSnapshot } from '../../usage/domain/DailyUsage'

export interface FlashcardView {
  id: string
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
  deckId: string
  lemma: string
  gloss: string
  partOfSpeech: string
  gender?: WordGender
}

export interface GeneratedFlashcard {
  lemma: string
  gloss: string
  partOfSpeech: string
  gender?: WordGender
  example: string
  exampleTranslation: string
}

export interface FlashcardGradeView {
  flashcardId: string
  isCorrect: boolean
  score: number
  acceptedGloss: string
  note?: string
  // Back-of-card reveal shown after grading
  lemma: string
  gloss: string
  example: string
  exampleTranslation: string
  // The learner's daily-cap posture after this grade counted (flashcards share the sentence cap),
  // so the practice UI can update its near-cap banner without a refetch.
  dailyUsage: DailyUsageSnapshot
}

export function toFlashcardView(row: FlashcardRow): FlashcardView {
  const view: FlashcardView = {
    id: row.id,
    learnLanguage: row.learnLanguage as LanguageCode,
    guessLanguage: row.guessLanguage as LanguageCode,
    locale: row.locale,
    deckId: row.deckId,
    lemma: row.lemma,
    gloss: row.gloss,
    partOfSpeech: row.partOfSpeech,
  }
  if (row.gender) view.gender = row.gender
  return view
}
