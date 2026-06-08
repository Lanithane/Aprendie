import { Router } from 'express'
import { z } from 'zod'
import type { UserRow } from '../../../infrastructure/db/schema'
import { requireAuth } from '../../../infrastructure/http/requireAuth'
import { asyncHandler } from '../../../infrastructure/http/asyncHandler'
import { getGrammarReference } from '../application/getGrammarReference'
import { isValidLanguagePair, type LanguageCode } from '../../../../shared/languages'

const router = Router()

router.use(requireAuth)

const querySchema = z.object({
  learnLanguage: z.string().min(1),
  guessLanguage: z.string().min(1),
  locale: z.string().min(1),
})

// GET /api/grammar?learnLanguage&guessLanguage&locale — the cached-or-generated grammar reference
// for the active pair. The client passes its active pair (which may be an optimistic override not
// yet on the user row), so we validate the triple here. Access-gate (403) / daily-cap (429) /
// spend-pause (503) errors propagate to the shared errorHandler with their machine codes.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = querySchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    }
    const { learnLanguage, guessLanguage, locale } = parsed.data
    if (!isValidLanguagePair(learnLanguage, guessLanguage, locale)) {
      return res.status(400).json({ error: 'invalid language pair' })
    }
    const reference = await getGrammarReference({
      user: req.user as UserRow,
      learnLanguage: learnLanguage as LanguageCode,
      guessLanguage: guessLanguage as LanguageCode,
      locale,
    })
    res.json(reference)
  })
)

export default router
