import { assertCanSpend } from '../../user/application/access'
import { assertSpendEnabled } from '../../settings/application/appSettings'
import { getOperatorAnthropicClient } from '../../../infrastructure/claude/anthropicClient'
import { recordUsage } from '../../showback/application/recordUsage'
import { SENTENCE_MODEL } from '../../../infrastructure/claude/anthropicClient'
import { getLexemeStatsForDeck } from '../../palabradex/application/listPalabradex'
import * as flashcardRepository from '../persistence/flashcardRepository'
import { generateFlashcardBatch } from './generateFlashcardBatch'
import { selectNextFlashcard, type CardCandidate, type CardStat } from '../domain/selectFlashcard'
import { toFlashcardView, type FlashcardView } from '../domain/Flashcard'
import { deckById } from '../../../../shared/decks'
import type { UserRow } from '../../../infrastructure/db/schema'
import type { LanguageCode, LocaleCode } from '../../../../shared/languages'
import { createHash } from 'crypto'

export interface NextFlashcardInput {
  user: UserRow
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
  deckId: string
}

export class DeckNotFoundError extends Error {
  constructor(id: string) {
    super(`unknown deck: ${id}`)
    this.name = 'DeckNotFoundError'
  }
}

function normalise(s: string): string {
  return s.normalize('NFC').toLowerCase().trim()
}

function contentHash(lemma: string): string {
  return createHash('sha1').update(normalise(lemma)).digest('hex')
}

export async function getNextFlashcard(input: NextFlashcardInput): Promise<FlashcardView> {
  assertCanSpend(input.user)
  await assertSpendEnabled(input.user)

  const deck = deckById(input.deckId)
  if (!deck) throw new DeckNotFoundError(input.deckId)

  const slice: flashcardRepository.DeckSlice = {
    learnLanguage: input.learnLanguage,
    guessLanguage: input.guessLanguage,
    locale: input.locale,
    deckId: input.deckId,
  }

  let rows = await flashcardRepository.listDeck(slice)

  // Cold start: deck is empty for this slice — generate inline then reload.
  if (rows.length === 0) {
    const anthropic = getOperatorAnthropicClient()
    const { cards, usage } = await generateFlashcardBatch(anthropic, {
      learnLanguage: input.learnLanguage,
      guessLanguage: input.guessLanguage,
      locale: input.locale,
      deck,
    })
    const now = new Date()
    const perCard = cards.length > 0 ? Math.round(usage.inputTokens / cards.length) : 0
    await flashcardRepository.insertCards(
      cards.map((c) => ({
        learnLanguage: input.learnLanguage,
        guessLanguage: input.guessLanguage,
        locale: input.locale,
        deckId: input.deckId,
        lemma: c.lemma,
        gloss: c.gloss,
        partOfSpeech: c.partOfSpeech,
        gender: c.gender ?? null,
        example: c.example || null,
        exampleTranslation: c.exampleTranslation || null,
        contentHash: contentHash(c.lemma),
        genInputTokens: perCard,
        genOutputTokens: Math.round(usage.outputTokens / cards.length),
        genCachedInputTokens: Math.round(usage.cacheReadInputTokens / cards.length),
        createdAt: now,
      }))
    )
    recordUsage({
      userId: input.user.id,
      operation: 'flashcard_batch',
      model: SENTENCE_MODEL,
      usage,
    }).catch((err) => console.error('[showback] recordUsage(flashcard_batch) failed:', err))

    rows = await flashcardRepository.listDeck(slice)
  }

  // Load the user's lexeme stats (cross-module, via palabradex application).
  const allStats = await getLexemeStatsForDeck(input.user.id, input.learnLanguage)
  const deckLemmaSet = new Set(rows.map((r) => normalise(r.lemma)))
  const stats: CardStat[] = allStats
    .filter((s) => deckLemmaSet.has(normalise(s.lemma)))
    .map((s) => ({
      lemma: s.lemma,
      seenCount: s.seenCount,
      correctCount: s.correctCount,
      incorrectCount: s.incorrectCount,
      lastSeenAt: s.lastSeenAt,
    }))

  // Build cooldown set from the 3 most-recently-seen lemmas so nothing repeats immediately.
  const sortedByRecent = [...stats].sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime())
  const recentLemmas = new Set(sortedByRecent.slice(0, 3).map((s) => normalise(s.lemma)))

  const candidates: CardCandidate[] = rows.map((r) => ({
    id: r.id,
    lemma: r.lemma,
    createdAt: r.createdAt,
  }))

  const cardId = selectNextFlashcard(candidates, stats, recentLemmas)
  const card = cardId ? rows.find((r) => r.id === cardId) : null
  if (!card) throw new Error('flashcard deck empty after generation')

  return toFlashcardView(card)
}
