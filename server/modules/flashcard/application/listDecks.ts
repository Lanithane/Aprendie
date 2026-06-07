import { DECKS, type DeckDef } from '../../../../shared/decks'
import * as flashcardRepository from '../persistence/flashcardRepository'
import { getLexemeStatsForDeck } from '../../palabradex/application/listPalabradex'
import type { LanguageCode, LocaleCode } from '../../../../shared/languages'

export interface DeckProgress {
  seen: number
  total: number
  struggling: number
}

export interface DeckSummary extends DeckDef {
  progress: DeckProgress
}

function normalise(s: string): string {
  return s.normalize('NFC').toLowerCase().trim()
}

export async function listDecksWithProgress(
  userId: string,
  learnLanguage: LanguageCode,
  guessLanguage: LanguageCode,
  locale: LocaleCode
): Promise<DeckSummary[]> {
  // Load all lexeme stats once; filter per deck below.
  const allStats = await getLexemeStatsForDeck(userId, learnLanguage)
  const statsByLemma = new Map(allStats.map((s) => [normalise(s.lemma), s]))

  return Promise.all(
    DECKS.map(async (deck) => {
      const rows = await flashcardRepository.listDeck({
        learnLanguage,
        guessLanguage,
        locale,
        deckId: deck.id,
      })
      const total = rows.length
      let seen = 0
      let struggling = 0
      for (const row of rows) {
        const stat = statsByLemma.get(normalise(row.lemma))
        if (!stat) continue
        seen += 1
        const attempts = stat.correctCount + stat.incorrectCount
        if (attempts > 0 && stat.incorrectCount / attempts > 0.4) struggling += 1
      }
      return { ...deck, progress: { seen, total, struggling } }
    })
  )
}
