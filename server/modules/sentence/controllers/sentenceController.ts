import { Router } from 'express'
import { z } from 'zod'
import type { UserRow } from '../../../infrastructure/db/schema'
import { requireAuth } from '../../../infrastructure/http/requireAuth'
import { getNextSentence } from '../application/getNextSentence'
import { isSupportedLanguage, isValidLocaleFor } from '../../../../shared/languages'
import { isLevelCode } from '../../../../shared/levels'

const router = Router()

const querySchema = z.object({
  learnLanguage: z.string(),
  guessLanguage: z.string(),
  locale: z.string(),
  level: z.string().optional(),
})

router.get('/', requireAuth, async (req, res, next) => {
  const parsed = querySchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
  }
  const { learnLanguage, guessLanguage, locale } = parsed.data
  if (!isSupportedLanguage(learnLanguage) || !isSupportedLanguage(guessLanguage)) {
    return res.status(400).json({ error: 'unsupported language' })
  }
  if (learnLanguage === guessLanguage) {
    return res.status(400).json({ error: 'learn and guess languages must differ' })
  }
  if (!isValidLocaleFor(learnLanguage, locale)) {
    return res.status(400).json({ error: 'locale not valid for learn language' })
  }
  const level = parsed.data.level && isLevelCode(parsed.data.level) ? parsed.data.level : undefined

  try {
    const view = await getNextSentence({
      user: req.user as UserRow,
      learnLanguage,
      guessLanguage,
      locale,
      level,
    })
    res.json(view)
  } catch (err) {
    next(err)
  }
})

export default router
