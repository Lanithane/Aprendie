import { Router } from 'express'
import { z } from 'zod'
import type { UserRow } from '../../../infrastructure/db/schema'
import { requireAuth } from '../../../infrastructure/http/requireAuth'
import { asyncHandler } from '../../../infrastructure/http/asyncHandler'
import { listPalabradex, getRootDetail, listLanguages } from '../application/listPalabradex'
import { defineLexeme } from '../application/defineLexeme'
import { LEXEME_SORTS, type LexemeSort } from '../domain/Lexeme'
import type { LanguageCode } from '../../../../shared/languages'

const router = Router()

router.use(requireAuth)

const listQuerySchema = z.object({
  learnLanguage: z.string().min(1),
  sort: z.enum(LEXEME_SORTS as unknown as [LexemeSort, ...LexemeSort[]]).optional(),
})

const detailQuerySchema = z.object({
  learnLanguage: z.string().min(1),
})

const definitionQuerySchema = z.object({
  learnLanguage: z.string().min(1),
  guessLanguage: z.string().min(1),
})

// Must precede /:lemma so Express doesn't match "languages" as a lemma.
router.get(
  '/languages',
  asyncHandler(async (req, res) => {
    const langs = await listLanguages((req.user as UserRow).id)
    res.json(langs)
  })
)

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = listQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    }
    const { learnLanguage, sort } = parsed.data
    const entries = await listPalabradex((req.user as UserRow).id, learnLanguage, sort ?? 'seen')
    res.json(entries)
  })
)

router.get(
  '/:lemma/definition',
  asyncHandler(async (req, res) => {
    const parsed = definitionQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    }
    const definition = await defineLexeme({
      user: req.user as UserRow,
      learnLanguage: parsed.data.learnLanguage as LanguageCode,
      guessLanguage: parsed.data.guessLanguage as LanguageCode,
      lemma: req.params.lemma,
    })
    if (definition === null) return res.status(404).json({ error: 'lexeme not found' })
    res.json({ definition })
  })
)

router.get(
  '/:lemma',
  asyncHandler(async (req, res) => {
    const parsed = detailQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    }
    const detail = await getRootDetail(
      (req.user as UserRow).id,
      parsed.data.learnLanguage,
      req.params.lemma
    )
    if (!detail) return res.status(404).json({ error: 'lexeme not found' })
    res.json(detail)
  })
)

export default router
