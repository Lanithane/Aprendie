import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../../../infrastructure/http/requireAuth'
import { requireAdmin } from '../../../infrastructure/http/requireAdmin'
import { asyncHandler } from '../../../infrastructure/http/asyncHandler'
import { UserNotFoundError, LastAdminError } from '../domain/errors'
import {
  listUsers,
  setUserRole,
  setUserAccess,
  setUserCapExempt,
  setUserCapOverride,
  adminDeleteUser,
} from '../application/adminUsers'
import { adminGetUserHistory } from '../application/adminUserHistory'

const router = Router()

router.use(requireAuth, requireAdmin)

const roleBodySchema = z.object({ role: z.enum(['admin', 'user']) })
const accessBodySchema = z.object({ access: z.enum(['pending', 'approved', 'blocked']) })
// `until` is an ISO datetime to uncap until, or null to re-cap now.
const capExemptBodySchema = z.object({ until: z.string().datetime().nullable() })
// `cap` is a per-user daily ceiling, or null to fall back to the global cap.
const capOverrideBodySchema = z.object({
  cap: z.coerce.number().int().min(1).max(10000).nullable(),
})

const historyQuerySchema = z
  .object({
    learnLanguage: z.string().optional(),
    guessLanguage: z.string().optional(),
    locale: z.string().optional(),
    limit: z.coerce.number().int().positive().max(200).optional(),
    cursor: z.string().optional(),
  })
  .refine(
    (q) => {
      const set = [q.learnLanguage, q.guessLanguage, q.locale].filter(Boolean).length
      return set === 0 || set === 3
    },
    { message: 'learnLanguage, guessLanguage and locale must be provided together' }
  )

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

router.patch(
  '/:id/access',
  asyncHandler(async (req, res) => {
    const parsed = accessBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    }
    try {
      res.json(await setUserAccess(req.params.id, parsed.data.access))
    } catch (err) {
      if (err instanceof UserNotFoundError) return res.status(404).json({ error: err.message })
      throw err
    }
  })
)

router.patch(
  '/:id/cap-exempt',
  asyncHandler(async (req, res) => {
    const parsed = capExemptBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    }
    try {
      const until = parsed.data.until ? new Date(parsed.data.until) : null
      res.json(await setUserCapExempt(req.params.id, until))
    } catch (err) {
      if (err instanceof UserNotFoundError) return res.status(404).json({ error: err.message })
      throw err
    }
  })
)

router.patch(
  '/:id/cap-override',
  asyncHandler(async (req, res) => {
    const parsed = capOverrideBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    }
    try {
      res.json(await setUserCapOverride(req.params.id, parsed.data.cap))
    } catch (err) {
      if (err instanceof UserNotFoundError) return res.status(404).json({ error: err.message })
      throw err
    }
  })
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    try {
      await adminDeleteUser(req.params.id)
      res.status(204).end()
    } catch (err) {
      if (err instanceof UserNotFoundError) return res.status(404).json({ error: err.message })
      throw err
    }
  })
)

router.get(
  '/:id/history',
  asyncHandler(async (req, res) => {
    const parsed = historyQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    }
    const { learnLanguage, guessLanguage, locale, limit, cursor } = parsed.data
    const pair =
      learnLanguage && guessLanguage && locale
        ? { learnLanguage, guessLanguage, locale }
        : undefined
    try {
      res.json(await adminGetUserHistory(req.params.id, { pair, limit, cursor }))
    } catch (err) {
      if (err instanceof UserNotFoundError) return res.status(404).json({ error: err.message })
      throw err
    }
  })
)

export default router
