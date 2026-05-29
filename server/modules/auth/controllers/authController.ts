import { Router, type RequestHandler } from 'express'
import type { AuthenticateOptions } from 'passport'
import { passport } from '../application/passport'
import { env } from '../../../env'

const router = Router()

// @types/passport types `authenticate()`'s return as `any`; it's an Express handler.
const authenticateGoogle = (options: AuthenticateOptions): RequestHandler =>
  passport.authenticate('google', options) as RequestHandler

router.get('/google', (req, res, next) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({ error: 'Google OAuth is not configured on this server' })
  }
  authenticateGoogle({ scope: ['profile', 'email'] })(req, res, next)
})

router.get('/google/callback', authenticateGoogle({ failureRedirect: '/login' }), (_req, res) => {
  res.redirect('/')
})

router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err)
    req.session.destroy(() => res.status(204).end())
  })
})

router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err)
    req.session.destroy(() => res.redirect('/login'))
  })
})

export default router
