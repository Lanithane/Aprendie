import { Router } from 'express'
import { z } from 'zod'
import type { UserRow } from '../../../infrastructure/db/schema'
import { requireAuth } from '../../../infrastructure/http/requireAuth'
import { requireAdmin } from '../../../infrastructure/http/requireAdmin'
import { asyncHandler } from '../../../infrastructure/http/asyncHandler'
import { EVENT_NAMES } from '../domain/Event'
import { recordEvent } from '../application/recordEvent'
import { summarizeEvents } from '../application/summarizeEvents'

const router = Router()

router.use(requireAuth)

const ingestSchema = z.object({
  name: z.enum(EVENT_NAMES),
  // Free-form, shallow context. Bounded so a client can't write arbitrarily large blobs.
  props: z.record(z.string(), z.unknown()).optional(),
})

// Client-side event ingest. Fire-and-forget from the caller's view: always 202, and a logging
// failure must not surface to the user, so we never block on (or await) persistence here — the
// handler is intentionally synchronous and swallows the insert's rejection.
router.post('/', (req, res) => {
  const parsed = ingestSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    return
  }
  recordEvent({
    name: parsed.data.name,
    userId: (req.user as UserRow).id,
    props: parsed.data.props ?? null,
  }).catch((err) => console.error(`[analytics] ingest(${parsed.data.name}) failed:`, err))
  res.status(202).json({ ok: true })
})

const summaryQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(365).optional(),
})

// Admin analytics summary.
router.get(
  '/summary',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const parsed = summaryQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    }
    res.json(await summarizeEvents(parsed.data.days))
  })
)

export default router
