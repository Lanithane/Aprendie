import { Router } from 'express'
import type { UserRow } from '../../../infrastructure/db/schema'
import { requireAuth } from '../../../infrastructure/http/requireAuth'
import { asyncHandler } from '../../../infrastructure/http/asyncHandler'
import { apiKeyBodySchema } from '../domain/apiKey'
import { InvalidApiKeyError } from '../domain/errors'
import { saveApiKey, removeApiKey } from '../application/saveApiKey'

const router = Router()

router.get('/status', requireAuth, (req, res) => {
  const user = req.user as UserRow
  res.json({ hasApiKey: Boolean(user.encryptedAnthropicKey) })
})

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user as UserRow
    const parsed = apiKeyBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    }
    try {
      await saveApiKey(user.id, parsed.data.apiKey)
      res.status(204).end()
    } catch (err) {
      if (err instanceof InvalidApiKeyError) {
        return res.status(400).json({ error: err.message })
      }
      throw err
    }
  })
)

router.delete(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user as UserRow
    await removeApiKey(user.id)
    res.status(204).end()
  })
)

export default router
