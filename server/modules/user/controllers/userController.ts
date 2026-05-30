import { Router } from 'express'
import { z } from 'zod'
import type { UserRow } from '../../../infrastructure/db/schema'
import { requireAuth } from '../../../infrastructure/http/requireAuth'
import { asyncHandler } from '../../../infrastructure/http/asyncHandler'
import { toUserView } from '../domain/User'
import { setUserLevel } from '../application/setUserLevel'
import { setUserAppearance } from '../application/setUserAppearance'
import { LEVEL_CODES, type LevelCode } from '../../../../shared/levels'
import { THEME_MODES } from '../../../../shared/appearance'

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

// Either field may be sent; theme id is an opaque registry string (length-capped), mode is enum.
const appearanceBodySchema = z
  .object({
    themeId: z.string().min(1).max(40).nullable().optional(),
    themeMode: z.enum(THEME_MODES).nullable().optional(),
  })
  .refine((b) => b.themeId !== undefined || b.themeMode !== undefined, {
    message: 'Provide themeId and/or themeMode',
  })

router.patch(
  '/appearance',
  requireAuth,
  asyncHandler(async (req, res) => {
    const patch = appearanceBodySchema.parse(req.body)
    const view = await setUserAppearance((req.user as UserRow).id, patch)
    res.json(view)
  })
)

export default router
