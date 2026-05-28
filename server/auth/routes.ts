import { Router } from 'express'
import { passport } from './passport'
import { env } from '../env'

const router = Router()

router.get('/google', (req, res, next) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({ error: 'Google OAuth is not configured on this server' })
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next)
})

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (_req, res) => {
    res.redirect('/')
  }
)

router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err)
    req.session.destroy(() => res.status(204).end())
  })
})

// GET fallback so a plain <a href="/api/auth/logout"> works
router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err)
    req.session.destroy(() => res.redirect('/login'))
  })
})

export default router
