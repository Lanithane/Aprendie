import { and, eq } from 'drizzle-orm'
import { db } from '../../../infrastructure/db/client'
import { grammarReferences, type GrammarReferenceRow } from '../../../infrastructure/db/schema'
import type { GrammarPosSection } from '../domain/GrammarReference'

// Shared grammar-reference cache lookup, keyed by the (learn, guess, locale) triple. Returns null
// on a miss so the caller knows to generate one.
export async function getReference(
  learnLanguage: string,
  guessLanguage: string,
  locale: string
): Promise<GrammarReferenceRow | null> {
  const rows = await db
    .select()
    .from(grammarReferences)
    .where(
      and(
        eq(grammarReferences.learnLanguage, learnLanguage),
        eq(grammarReferences.guessLanguage, guessLanguage),
        eq(grammarReferences.locale, locale)
      )
    )
    .limit(1)
  return rows[0] ?? null
}

// Persist a freshly generated reference. onConflictDoNothing makes it race-safe: if two learners
// generate the same triple at once, the first write wins and the second is a harmless no-op (the
// philosophy as `saveDefinition`).
export async function saveReference(
  learnLanguage: string,
  guessLanguage: string,
  locale: string,
  sections: GrammarPosSection[]
): Promise<void> {
  await db
    .insert(grammarReferences)
    .values({ learnLanguage, guessLanguage, locale, sections })
    .onConflictDoNothing({
      target: [
        grammarReferences.learnLanguage,
        grammarReferences.guessLanguage,
        grammarReferences.locale,
      ],
    })
}
