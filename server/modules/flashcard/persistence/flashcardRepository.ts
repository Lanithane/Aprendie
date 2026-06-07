import { and, eq } from 'drizzle-orm'
import { db } from '../../../infrastructure/db/client'
import {
  flashcards,
  type FlashcardRow,
  type NewFlashcardRow,
} from '../../../infrastructure/db/schema'
import type { LanguageCode, LocaleCode } from '../../../../shared/languages'

export interface DeckSlice {
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
  deckId: string
}

// Insert freshly generated flash cards, deduplicating on the content key (normalised lemma per deck
// slice). Existing cards are silently skipped — the original token cost stays attributed.
export async function insertCards(rows: NewFlashcardRow[]): Promise<void> {
  if (rows.length === 0) return
  await db
    .insert(flashcards)
    .values(rows)
    .onConflictDoNothing({
      target: [
        flashcards.learnLanguage,
        flashcards.guessLanguage,
        flashcards.locale,
        flashcards.deckId,
        flashcards.contentHash,
      ],
    })
}

// All cards in one deck slice — loaded whole so the pure picker can choose without a DB ordering
// policy leaking into persistence.
export async function listDeck(slice: DeckSlice): Promise<FlashcardRow[]> {
  return db
    .select()
    .from(flashcards)
    .where(
      and(
        eq(flashcards.learnLanguage, slice.learnLanguage),
        eq(flashcards.guessLanguage, slice.guessLanguage),
        eq(flashcards.locale, slice.locale),
        eq(flashcards.deckId, slice.deckId)
      )
    )
}

export async function findById(flashcardId: string): Promise<FlashcardRow | null> {
  const rows = await db.select().from(flashcards).where(eq(flashcards.id, flashcardId)).limit(1)
  return rows[0] ?? null
}
