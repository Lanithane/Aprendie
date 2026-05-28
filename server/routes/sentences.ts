import { Router } from 'express'
import { z } from 'zod'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { sentenceCache, type User } from '../db/schema'
import { requireAuth } from '../middleware/requireAuth'
import { clientForUser, MissingApiKeyError } from '../claude/client'
import { generateSentenceBatch } from '../claude/sentences'

const router = Router()

const REFILL_THRESHOLD = 3

const localeSchema = z.enum(['es-MX', 'es-ES', 'es-AR']).default('es-MX')

router.get('/', requireAuth, async (req, res, next) => {
  const user = req.user as User
  const localeParsed = localeSchema.safeParse(req.query.locale)
  const locale = localeParsed.success ? localeParsed.data : 'es-MX'

  try {
    // Count unused cached sentences for this user+locale; refill batch if too few.
    const [{ count }] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(sentenceCache)
      .where(
        and(
          eq(sentenceCache.userId, user.id),
          eq(sentenceCache.locale, locale),
          isNull(sentenceCache.consumedAt)
        )
      )

    if (count < REFILL_THRESHOLD) {
      const anthropic = clientForUser(user)
      const batch = await generateSentenceBatch(anthropic, locale)
      await db.insert(sentenceCache).values(
        batch.map((s) => ({
          userId: user.id,
          locale,
          spanish: s.spanish,
          expectedEnglish: s.expectedEnglish,
          difficulty: s.difficulty,
          grammarFocus: s.grammarFocus,
        }))
      )
    }

    // Pop the oldest unused sentence and mark it consumed.
    const candidates = await db
      .select()
      .from(sentenceCache)
      .where(
        and(
          eq(sentenceCache.userId, user.id),
          eq(sentenceCache.locale, locale),
          isNull(sentenceCache.consumedAt)
        )
      )
      .orderBy(sentenceCache.createdAt)
      .limit(1)

    if (candidates.length === 0) {
      return res.status(500).json({ error: 'sentence_cache empty after refill' })
    }

    const sentence = candidates[0]
    await db
      .update(sentenceCache)
      .set({ consumedAt: new Date() })
      .where(eq(sentenceCache.id, sentence.id))

    res.json({
      id: sentence.id,
      locale: sentence.locale,
      spanish: sentence.spanish,
      expectedEnglish: sentence.expectedEnglish,
      difficulty: sentence.difficulty,
      grammarFocus: sentence.grammarFocus,
    })
  } catch (err) {
    if (err instanceof MissingApiKeyError) {
      return res.status(412).json({ error: 'No Anthropic API key configured for this user' })
    }
    next(err)
  }
})

export default router
