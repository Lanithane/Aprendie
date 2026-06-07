import { Router } from 'express'
import { z } from 'zod'
import type { UserRow } from '../../../infrastructure/db/schema'
import { requireAuth } from '../../../infrastructure/http/requireAuth'
import { asyncHandler } from '../../../infrastructure/http/asyncHandler'
import { ensureWarmFirstSentence, getNextSentence } from '../application/getNextSentence'
import {
  isSupportedLanguage,
  isValidLocaleFor,
  type LanguageCode,
  type LocaleCode,
} from '../../../../shared/languages'
import { isLevelCode, type LevelCode } from '../../../../shared/levels'
import { categoryById } from '../../../../shared/categories'

const router = Router()

interface PoolParams {
  learnLanguage: LanguageCode
  guessLanguage: LanguageCode
  locale: LocaleCode
  level?: LevelCode
}

// Shared validation for the pool selectors carried by both `GET /` (query) and
// `POST /warm` (body): supported, distinct languages and a locale valid for the learn
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
  // A pinned-topic id (see shared/categories). Optional and only honored by `GET /`.
  category: z.string().optional(),
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

    // Resolve the pinned-topic id to its domain string; an unknown/stale id is leniently ignored
    // (treated as no pin) rather than failing the request.
    const category = parsed.data.category ? categoryById(parsed.data.category)?.domain : undefined
    const view = await getNextSentence({ user: req.user as UserRow, ...pool, category })
    res.json(view)
  })
)

// Warm the slice for the given selections, BLOCKING until at least one sentence exists (inline
// generation if the shared corpus is cold), then return. Called from onboarding so the first
// practice sentence is ready by the time the learner lands on it, instead of cold-starting there.
router.post(
  '/warm',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = selectorSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    }
    const pool = parsePoolParams(parsed.data)
    if ('error' in pool) return res.status(400).json({ error: pool.error })
    await ensureWarmFirstSentence({ user: req.user as UserRow, ...pool })
    res.json({ ok: true })
  })
)

export default router
