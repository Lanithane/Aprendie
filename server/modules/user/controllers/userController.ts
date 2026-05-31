import { Router } from 'express'
import { z } from 'zod'
import type { UserRow } from '../../../infrastructure/db/schema'
import { requireAuth } from '../../../infrastructure/http/requireAuth'
import { asyncHandler } from '../../../infrastructure/http/asyncHandler'
import { toUserView } from '../domain/User'
import { setUserLevel } from '../application/setUserLevel'
import { setUserAppearance } from '../application/setUserAppearance'
import { setUserAutoSpeak } from '../application/setUserAutoSpeak'
import { setUserLanguagePair } from '../application/setUserLanguagePair'
import { bootstrapSentenceForUser } from '../application/bootstrapSentenceForUser'
import { LEVEL_CODES, type LevelCode } from '../../../../shared/levels'
import { THEME_MODES } from '../../../../shared/appearance'
import { AUTO_SPEAK_DELAY_MIN_MS, AUTO_SPEAK_DELAY_MAX_MS } from '../../../../shared/speech'
import { isValidLanguagePair } from '../../../../shared/languages'

const router = Router()

// `?bootstrap=1` (only the initial app-load call sends it) additionally returns a warm
// pool sentence to collapse the /me -> /sentence/next waterfall. It's opt-in so ordinary
// refresh()es (after a level/theme/pair change) don't drain the pool as a side effect.
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user as UserRow
    const bootstrapSentence =
      req.query.bootstrap === '1' ? await bootstrapSentenceForUser(user) : null
    // Absolute expiry of the current session (epoch ms), mirrored from the httpOnly cookie
    // so the SPA can show a "session expired" notice once the 30-day window lapses.
    const sessionExpiresAt = req.session.cookie.expires?.getTime() ?? null
    res.json({ ...toUserView(user), bootstrapSentence, sessionExpiresAt })
  })
)

const levelBodySchema = z.object({
  level: z.enum(LEVEL_CODES as [LevelCode, ...LevelCode[]]).nullable(),
})

router.patch(
  '/level',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = levelBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    }
    const { level } = parsed.data
    const view = await setUserLevel((req.user as UserRow).id, level)
    res.json(view)
  })
)

const languagePairBodySchema = z
  .object({
    learnLanguage: z.string(),
    guessLanguage: z.string(),
    locale: z.string(),
  })
  .refine((b) => isValidLanguagePair(b.learnLanguage, b.guessLanguage, b.locale), {
    message: 'Invalid language pair',
  })

router.patch(
  '/language-pair',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = languagePairBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    }
    const view = await setUserLanguagePair((req.user as UserRow).id, parsed.data)
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
    const parsed = appearanceBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    }
    const view = await setUserAppearance((req.user as UserRow).id, parsed.data)
    res.json(view)
  })
)

// Either field may be sent; delay is validated against the shared bounds (client clamps too).
const autoSpeakBodySchema = z
  .object({
    autoSpeak: z.boolean().optional(),
    autoSpeakDelayMs: z
      .number()
      .int()
      .min(AUTO_SPEAK_DELAY_MIN_MS)
      .max(AUTO_SPEAK_DELAY_MAX_MS)
      .optional(),
  })
  .refine((b) => b.autoSpeak !== undefined || b.autoSpeakDelayMs !== undefined, {
    message: 'Provide autoSpeak and/or autoSpeakDelayMs',
  })

router.patch(
  '/auto-speak',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = autoSpeakBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    }
    const view = await setUserAutoSpeak((req.user as UserRow).id, parsed.data)
    res.json(view)
  })
)

export default router
