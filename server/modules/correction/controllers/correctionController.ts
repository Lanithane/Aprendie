import { Router } from 'express'
import { z } from 'zod'
import type { UserRow } from '../../../infrastructure/db/schema'
import { requireAuth } from '../../../infrastructure/http/requireAuth'
import { asyncHandler } from '../../../infrastructure/http/asyncHandler'
import { correctTranslation, SentenceNotFoundError } from '../application/correctTranslation'

const router = Router()

const bodySchema = z.object({
  sentenceId: z.string().uuid(),
  userAnswer: z.string().min(1),
})

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    }
    try {
      const view = await correctTranslation({
        user: req.user as UserRow,
        sentenceId: parsed.data.sentenceId,
        userAnswer: parsed.data.userAnswer,
      })
      res.json(view)
    } catch (err) {
      if (err instanceof SentenceNotFoundError) {
        return res.status(404).json({ error: err.message })
      }
      throw err
    }
  })
)

export default router
