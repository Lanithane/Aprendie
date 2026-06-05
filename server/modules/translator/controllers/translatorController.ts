import { Router } from 'express'
import { z } from 'zod'
import type { UserRow } from '../../../infrastructure/db/schema'
import { requireAuth } from '../../../infrastructure/http/requireAuth'
import { asyncHandler } from '../../../infrastructure/http/asyncHandler'
import { translateText } from '../application/translateText'
import { isSupportedLanguage, isValidLocaleFor } from '../../../../shared/languages'

const router = Router()

const bodySchema = z.object({
  learnLanguage: z.string(),
  guessLanguage: z.string(),
  locale: z.string(),
  text: z.string().trim().min(1).max(1000),
  // Optional: flip the translation direction to learning → known. State isn't persisted; the
  // client just tells us which way to go on each submit.
  swapped: z.boolean().optional(),
})

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    }
    const { learnLanguage, guessLanguage, locale, text, swapped } = parsed.data
    if (!isSupportedLanguage(learnLanguage) || !isSupportedLanguage(guessLanguage)) {
      return res.status(400).json({ error: 'unsupported language' })
    }
    if (learnLanguage === guessLanguage) {
      return res.status(400).json({ error: 'learn and guess languages must differ' })
    }
    if (!isValidLocaleFor(learnLanguage, locale)) {
      return res.status(400).json({ error: 'locale not valid for learn language' })
    }
    const result = await translateText({
      user: req.user as UserRow,
      learnLanguage,
      guessLanguage,
      locale,
      text,
      swapped,
    })
    res.json(result)
  })
)

export default router
