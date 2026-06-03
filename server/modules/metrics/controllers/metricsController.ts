import { Router } from 'express'
import { z } from 'zod'
import type { UserRow } from '../../../infrastructure/db/schema'
import { requireAuth } from '../../../infrastructure/http/requireAuth'
import { requireAdmin } from '../../../infrastructure/http/requireAdmin'
import { asyncHandler } from '../../../infrastructure/http/asyncHandler'
import { getSiteMetrics } from '../application/getSiteMetrics'
import { getUserMetrics } from '../application/getUserMetrics'

const router = Router()

router.use(requireAuth)

const rangeSchema = z.object({ range: z.enum(['all', '1w', '1d']).default('all') })

// Sitewide metrics (admin only): headline totals + attempts/spend/active-users series.
router.get(
  '/site',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const parsed = rangeSchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    }
    res.json(await getSiteMetrics(parsed.data.range))
  })
)

// The signed-in account's own metrics, for the history page.
router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const parsed = rangeSchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    }
    res.json(await getUserMetrics((req.user as UserRow).id, parsed.data.range))
  })
)

// Any account's metrics (admin only), for the admin user-detail page.
router.get(
  '/users/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const parsed = rangeSchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    }
    res.json(await getUserMetrics(req.params.id, parsed.data.range))
  })
)

export default router
