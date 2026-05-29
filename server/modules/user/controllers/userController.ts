import { Router } from 'express'
import { z } from 'zod'
import type { UserRow } from '../../../infrastructure/db/schema'
import { requireAuth } from '../../../infrastructure/http/requireAuth'
import { asyncHandler } from '../../../infrastructure/http/asyncHandler'
import { toUserView } from '../domain/User'
import { setUserLevel } from '../application/setUserLevel'
import { LEVEL_CODES, type LevelCode } from '../../../../shared/levels'

const router = Router()

router.get('/', requireAuth, (req, res) => {
  res.json(toUserView(req.user as UserRow))
})

const levelBodySchema = z.object({
  level: z.enum(LEVEL_CODES as [LevelCode, ...LevelCode[]]).nullable(),
})

router.patch(
  '/level',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { level } = levelBodySchema.parse(req.body)
    const view = await setUserLevel((req.user as UserRow).id, level)
    res.json(view)
  })
)

export default router
