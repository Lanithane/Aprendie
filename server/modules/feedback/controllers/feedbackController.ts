import { Router } from 'express'
import { z } from 'zod'
import type { UserRow } from '../../../infrastructure/db/schema'
import { requireAuth } from '../../../infrastructure/http/requireAuth'
import { requireAdmin } from '../../../infrastructure/http/requireAdmin'
import { asyncHandler } from '../../../infrastructure/http/asyncHandler'
import { FEEDBACK_CATEGORIES } from '../domain/Feedback'
import { recordFeedback } from '../application/recordFeedback'
import { listFeedback } from '../application/listFeedback'

const router = Router()

router.use(requireAuth)

const bodySchema = z.object({
  category: z.enum(FEEDBACK_CATEGORIES),
  message: z.string().trim().min(1).max(4000),
  // Page context is captured client-side (the in-app path). Optional and length-bounded.
  page: z.string().max(512).optional(),
})

// Any authenticated user can send feedback.
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    }
    const view = await recordFeedback({
      userId: (req.user as UserRow).id,
      category: parsed.data.category,
      message: parsed.data.message,
      page: parsed.data.page ?? null,
      userAgent: req.get('user-agent')?.slice(0, 512) ?? null,
    })
    res.status(201).json(view)
  })
)

const listQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
})

// Admin inbox.
router.get(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const parsed = listQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    }
    res.json(await listFeedback(parsed.data.limit))
  })
)

export default router
