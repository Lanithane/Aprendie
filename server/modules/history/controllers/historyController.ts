import { Router } from 'express'
import { z } from 'zod'
import type { UserRow } from '../../../infrastructure/db/schema'
import { requireAuth } from '../../../infrastructure/http/requireAuth'
import { asyncHandler } from '../../../infrastructure/http/asyncHandler'
import { listHistory, getHistoryEntry } from '../application/listHistory'

const router = Router()

router.use(requireAuth)

const querySchema = z
  .object({
    learnLanguage: z.string().optional(),
    guessLanguage: z.string().optional(),
    locale: z.string().optional(),
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

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = querySchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    }
    const { learnLanguage, guessLanguage, locale, limit, cursor } = parsed.data
    const pair =
      learnLanguage && guessLanguage && locale
        ? { learnLanguage, guessLanguage, locale }
        : undefined
    const page = await listHistory((req.user as UserRow).id, { pair, limit, cursor })
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
