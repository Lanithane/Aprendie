import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../../../infrastructure/http/requireAuth'
import { requireAdmin } from '../../../infrastructure/http/requireAdmin'
import { asyncHandler } from '../../../infrastructure/http/asyncHandler'
import { getSettings, updateSettings } from '../application/appSettings'

const router = Router()

router.use(requireAuth, requireAdmin)

// All three fields optional so the panel can PATCH one lever at a time.
const settingsBodySchema = z
  .object({
    dailyGradedCap: z.coerce.number().int().min(1).max(10000),
    signupsPaused: z.boolean(),
    spendPaused: z.boolean(),
  })
  .partial()
  .refine((b) => Object.keys(b).length > 0, { message: 'no fields to update' })

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await getSettings())
  })
)

router.patch(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = settingsBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    }
    res.json(await updateSettings(parsed.data))
  })
)

export default router
