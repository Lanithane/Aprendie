import { Router } from 'express'
import type { UserRow } from '../../../infrastructure/db/schema'
import { requireAuth } from '../../../infrastructure/http/requireAuth'
import { asyncHandler } from '../../../infrastructure/http/asyncHandler'
import { getDailyUsage } from '../application/dailyCap'

const router = Router()

// The signed-in learner's own daily-cap posture, so the practice UI can warn as they near the cap
// and explain the block once they hit it. Admin/exempt accounts come back `capped: false`.
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await getDailyUsage(req.user as UserRow))
  })
)

export default router
