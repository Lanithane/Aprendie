import { Router } from 'express'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { sentenceCache, type User } from '../db/schema'
import { requireAuth } from '../middleware/requireAuth'
import { clientForUser, MissingApiKeyError } from '../claude/client'
import { correctTranslation } from '../claude/correction'
import type { SpanishLocale } from '../../shared/types'

const router = Router()

const bodySchema = z.object({
  sentenceId: z.string().uuid(),
  userEnglish: z.string().min(1),
})

router.post('/', requireAuth, async (req, res, next) => {
  const user = req.user as User
  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
  }
  const { sentenceId, userEnglish } = parsed.data

  try {
    const rows = await db
      .select()
      .from(sentenceCache)
      .where(and(eq(sentenceCache.id, sentenceId), eq(sentenceCache.userId, user.id)))
      .limit(1)
    if (rows.length === 0) {
      return res.status(404).json({ error: 'sentence not found' })
    }
    const sentence = rows[0]

    const anthropic = clientForUser(user)
    const result = await correctTranslation(anthropic, {
      locale: sentence.locale as SpanishLocale,
      spanish: sentence.spanish,
      expectedEnglish: sentence.expectedEnglish,
      userEnglish,
    })

    res.json({
      sentenceId: sentence.id,
      spanish: sentence.spanish,
      expectedEnglish: sentence.expectedEnglish,
      userEnglish,
      ...result,
    })
  } catch (err) {
    if (err instanceof MissingApiKeyError) {
      return res.status(412).json({ error: 'No Anthropic API key configured for this user' })
    }
    next(err)
  }
})

export default router
