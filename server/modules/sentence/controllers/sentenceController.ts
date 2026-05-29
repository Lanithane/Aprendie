import { Router } from 'express'
import { z } from 'zod'
import type { UserRow } from '../../../infrastructure/db/schema'
import { requireAuth } from '../../../infrastructure/http/requireAuth'
import { getNextSentence } from '../application/getNextSentence'

const router = Router()

const localeSchema = z.enum(['es-MX', 'es-ES', 'es-AR']).default('es-MX')
const difficultySchema = z.coerce.number().int().min(1).max(5).optional()

router.get('/', requireAuth, async (req, res, next) => {
  const localeParsed = localeSchema.safeParse(req.query.locale)
  const locale = localeParsed.success ? localeParsed.data : 'es-MX'
  const difficultyParsed = difficultySchema.safeParse(req.query.difficulty)
  const difficulty = difficultyParsed.success ? difficultyParsed.data : undefined

  try {
    const view = await getNextSentence({ user: req.user as UserRow, locale, difficulty })
    res.json(view)
  } catch (err) {
    next(err)
  }
})

export default router
