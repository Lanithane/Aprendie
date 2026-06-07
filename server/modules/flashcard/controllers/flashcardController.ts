import { Router } from 'express'
import { z } from 'zod'
import type { UserRow } from '../../../infrastructure/db/schema'
import { requireAuth } from '../../../infrastructure/http/requireAuth'
import { asyncHandler } from '../../../infrastructure/http/asyncHandler'
import { getNextFlashcard, DeckNotFoundError } from '../application/getNextFlashcard'
import { gradeFlashcard, FlashcardNotFoundError } from '../application/gradeFlashcard'
import { listDecksWithProgress } from '../application/listDecks'
import type { LanguageCode } from '../../../../shared/languages'

const router = Router()

router.use(requireAuth)

const pairQuerySchema = z.object({
  learn: z.string().min(1),
  guess: z.string().min(1),
  locale: z.string().min(1),
})

const nextQuerySchema = pairQuerySchema.extend({
  deck: z.string().min(1),
})

const gradeBodySchema = z.object({
  flashcardId: z.string().uuid(),
  answer: z.string().min(1).max(200),
})

router.get(
  '/decks',
  asyncHandler(async (req, res) => {
    const parsed = pairQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    }
    const { learn, guess, locale } = parsed.data
    const user = req.user as UserRow
    const decks = await listDecksWithProgress(
      user.id,
      learn as LanguageCode,
      guess as LanguageCode,
      locale
    )
    res.json(decks)
  })
)

router.get(
  '/next',
  asyncHandler(async (req, res) => {
    const parsed = nextQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    }
    const { learn, guess, locale, deck } = parsed.data
    const user = req.user as UserRow
    try {
      const card = await getNextFlashcard({
        user,
        learnLanguage: learn as LanguageCode,
        guessLanguage: guess as LanguageCode,
        locale: locale,
        deckId: deck,
      })
      res.json(card)
    } catch (err) {
      if (err instanceof DeckNotFoundError) return res.status(404).json({ error: err.message })
      throw err
    }
  })
)

router.post(
  '/grade',
  asyncHandler(async (req, res) => {
    const parsed = gradeBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    }
    const user = req.user as UserRow
    try {
      const grade = await gradeFlashcard({
        user,
        flashcardId: parsed.data.flashcardId,
        answer: parsed.data.answer,
      })
      res.json(grade)
    } catch (err) {
      if (err instanceof FlashcardNotFoundError) return res.status(404).json({ error: err.message })
      throw err
    }
  })
)

export default router
