import { Router } from 'express'
import { z } from 'zod'
import type { UserRow } from '../../../infrastructure/db/schema'
import { requireAuth } from '../../../infrastructure/http/requireAuth'
import { asyncHandler } from '../../../infrastructure/http/asyncHandler'
import { resolveLocale } from '../application/resolveLocale'
import { isSupportedLanguage } from '../../../../shared/languages'

const router = Router()

const bodySchema = z.object({
  learnLanguage: z.string(),
  location: z.string().min(1).max(120),
})

router.post(
  '/resolve-locale',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    }
    const { learnLanguage, location } = parsed.data
    if (!isSupportedLanguage(learnLanguage)) {
      return res.status(400).json({ error: 'unsupported language' })
    }
    const result = await resolveLocale({ user: req.user as UserRow, learnLanguage, location })
    res.json(result)
  })
)

export default router
