import { Router } from 'express'
import { z } from 'zod'
import type { UserRow } from '../../../infrastructure/db/schema'
import { requireAuth } from '../../../infrastructure/http/requireAuth'
import { asyncHandler } from '../../../infrastructure/http/asyncHandler'
import { getNextSentence } from '../application/getNextSentence'
import { triggerBackgroundRefill } from '../application/sentencePool'
import {
  isSupportedLanguage,
  isValidLocaleFor,
  type LanguageCode,
  type LocaleCode,
} from '../../../../shared/languages'
import { isLevelCode, type LevelCode } from '../../../../shared/levels'

const router = Router()

interface PoolParams {
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
  level?: LevelCode
}

// Shared validation for the pool selectors carried by both `GET /` (query) and
// `POST /prewarm` (body): supported, distinct languages and a locale valid for the learn
// language. Returns a 400 message on failure, or the normalized params on success.
function parsePoolParams(input: {
  learnLanguage: string
  guessLanguage: string
  locale: string
  level?: string
}): { error: string } | PoolParams {
  const { learnLanguage, guessLanguage, locale } = input
  if (!isSupportedLanguage(learnLanguage) || !isSupportedLanguage(guessLanguage)) {
    return { error: 'unsupported language' }
  }
  if (learnLanguage === guessLanguage) {
    return { error: 'learn and guess languages must differ' }
  }
  if (!isValidLocaleFor(learnLanguage, locale)) {
    return { error: 'locale not valid for learn language' }
  }
  const level = input.level && isLevelCode(input.level) ? input.level : undefined
  return { learnLanguage, guessLanguage, locale, level }
}

const selectorSchema = z.object({
  learnLanguage: z.string(),
  guessLanguage: z.string(),
  locale: z.string(),
  level: z.string().optional(),
})

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = selectorSchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    }
    const pool = parsePoolParams(parsed.data)
    if ('error' in pool) return res.status(400).json({ error: pool.error })

    const view = await getNextSentence({ user: req.user as UserRow, ...pool })
    res.json(view)
  })
)

// Kick off a background pool fill with the given selections (no inline generation — returns
// immediately). Called by the wizard with staged selections so the pool is warm before submit.
router.post('/prewarm', requireAuth, (req, res) => {
  const parsed = selectorSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    return
  }
  const pool = parsePoolParams(parsed.data)
  if ('error' in pool) {
    res.status(400).json({ error: pool.error })
    return
  }
  triggerBackgroundRefill({ user: req.user as UserRow, ...pool })
  res.json({ ok: true })
})

export default router
