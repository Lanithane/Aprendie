import { Router } from 'express'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { users, type User } from '../db/schema'
import { encryptApiKey } from '../crypto/apiKey'
import { requireAuth } from '../middleware/requireAuth'

const router = Router()

router.get('/status', requireAuth, (req, res) => {
  const user = req.user as User
  res.json({ hasApiKey: Boolean(user.encryptedAnthropicKey) })
})

const bodySchema = z.object({
  apiKey: z
    .string()
    .min(20, 'API key looks too short')
    .startsWith('sk-ant-', 'Anthropic keys start with sk-ant-'),
})

router.post('/', requireAuth, async (req, res, next) => {
  const user = req.user as User
  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
  }
  const { apiKey } = parsed.data

  // Validate the key against Anthropic with a tiny call before we save it.
  try {
    const anthropic = new Anthropic({ apiKey })
    await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'ping' }],
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return res.status(400).json({ error: `API key validation failed: ${msg}` })
  }

  try {
    const encrypted = encryptApiKey(apiKey)
    await db
      .update(users)
      .set({ encryptedAnthropicKey: encrypted, updatedAt: new Date() })
      .where(eq(users.id, user.id))
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

router.delete('/', requireAuth, async (req, res, next) => {
  const user = req.user as User
  try {
    await db
      .update(users)
      .set({ encryptedAnthropicKey: null, updatedAt: new Date() })
      .where(eq(users.id, user.id))
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

export default router
