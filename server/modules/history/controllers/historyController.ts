import { Router } from 'express'
import { z } from 'zod'
import { LEVEL_CODES } from '../../../../shared/levels'
import type { UserRow } from '../../../infrastructure/db/schema'
import { requireAuth } from '../../../infrastructure/http/requireAuth'
import { asyncHandler } from '../../../infrastructure/http/asyncHandler'
import { listHistory, getHistoryEntry, listDistinctPairs } from '../application/listHistory'

const router = Router()

router.use(requireAuth)

const querySchema = z
  .object({
    learnLanguage: z.string().optional(),
    guessLanguage: z.string().optional(),
    locale: z.string().optional(),
    level: z.enum(LEVEL_CODES as [string, ...string[]]).optional(),
    sort: z.enum(['newest', 'worst']).optional(),
    limit: z.coerce.number().int().positive().max(200).optional(),
    cursor: z.string().optional(),
  })
  // The pair filter is all-or-nothing: either all three are present or none are.
  .refine(
    (q) => {
      const set = [q.learnLanguage, q.guessLanguage, q.locale].filter(Boolean).length
      return set === 0 || set === 3
    },
    { message: 'learnLanguage, guessLanguage and locale must be provided together' }
  )

// Must be defined before /:id so Express doesn't match "languages" as an id.
router.get(
  '/languages',
  asyncHandler(async (req, res) => {
    const pairs = await listDistinctPairs((req.user as UserRow).id)
    res.json(pairs)
  })
)

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = querySchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    }
    const { learnLanguage, guessLanguage, locale, level, sort, limit, cursor } = parsed.data
    const pair =
      learnLanguage && guessLanguage && locale
        ? { learnLanguage, guessLanguage, locale }
        : undefined
    const page = await listHistory((req.user as UserRow).id, { pair, level, sort, limit, cursor })
    res.json(page)
  })
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const view = await getHistoryEntry((req.user as UserRow).id, req.params.id)
    if (!view) return res.status(404).json({ error: 'attempt not found' })
    res.json(view)
  })
)

export default router
