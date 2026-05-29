import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../../../infrastructure/http/requireAuth'
import { requireAdmin } from '../../../infrastructure/http/requireAdmin'
import { asyncHandler } from '../../../infrastructure/http/asyncHandler'
import { UserNotFoundError, LastAdminError } from '../domain/errors'
import {
  listUsers,
  setUserRole,
  adminRevokeUserKey,
  adminRevalidateUserKey,
} from '../application/adminUsers'

const router = Router()

router.use(requireAuth, requireAdmin)

const roleBodySchema = z.object({ role: z.enum(['admin', 'user']) })

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await listUsers())
  })
)

router.patch(
  '/:id/role',
  asyncHandler(async (req, res) => {
    const parsed = roleBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    }
    try {
      res.json(await setUserRole(req.params.id, parsed.data.role))
    } catch (err) {
      if (err instanceof UserNotFoundError) return res.status(404).json({ error: err.message })
      if (err instanceof LastAdminError) return res.status(409).json({ error: err.message })
      throw err
    }
  })
)

router.delete(
  '/:id/key',
  asyncHandler(async (req, res) => {
    try {
      await adminRevokeUserKey(req.params.id)
      res.status(204).end()
    } catch (err) {
      if (err instanceof UserNotFoundError) return res.status(404).json({ error: err.message })
      throw err
    }
  })
)

router.post(
  '/:id/key/revalidate',
  asyncHandler(async (req, res) => {
    try {
      res.json(await adminRevalidateUserKey(req.params.id))
    } catch (err) {
      if (err instanceof UserNotFoundError) return res.status(404).json({ error: err.message })
      throw err
    }
  })
)

export default router
