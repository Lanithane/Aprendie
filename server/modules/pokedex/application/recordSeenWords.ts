import type { LanguageCode, WordToken } from '../../../../shared/languages'
import * as pokedexRepository from '../persistence/pokedexRepository'
import { computeSeenDeltas, type SeenMistake } from '../domain/seenWords'

export interface RecordSeenWordsInput {
  userId: string
  learnLanguage: LanguageCode
  wordBreakdown: WordToken[]
  mistakes: SeenMistake[]
  // The attempt's timestamp, so first/lastSeenAt are accurate during both live recording and
  // chronological backfill (rather than always "now").
  seenAt: Date
}

// Fold one graded attempt into the per-user Pokédex (root + variant grains). Called from
// history's `recordAttempt` (cross-module application orchestration). Pure delta computation
// lives in the domain; this only persists.
export async function recordSeenWords(input: RecordSeenWordsInput): Promise<void> {
  if (input.wordBreakdown.length === 0) return
  const { lexemes, variants } = computeSeenDeltas(input.wordBreakdown, input.mistakes)
  await pokedexRepository.upsertLexemes(input.userId, input.learnLanguage, lexemes, input.seenAt)
  await pokedexRepository.upsertVariants(input.userId, input.learnLanguage, variants, input.seenAt)
}
