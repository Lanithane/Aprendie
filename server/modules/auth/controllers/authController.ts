import { Router, type RequestHandler, type Request } from 'express'
import type { AuthenticateOptions } from 'passport'
import { passport } from '../application/passport'
import { env } from '../../../env'

const router = Router()

// passport-oauth2 honors a per-request `callbackURL` override; the base
// AuthenticateOptions type doesn't declare it, so widen it here.
type GoogleAuthOptions = AuthenticateOptions & { callbackURL?: string }

// @types/passport types `authenticate()`'s return as `any`; it's an Express handler.
const authenticateGoogle = (options: GoogleAuthOptions): RequestHandler =>
  passport.authenticate('google', options) as RequestHandler

// Build the callback from the host the request actually arrived on, so a user who
// starts on www.aprendie.com is returned to www and one on the apex to the apex.
// Both hosts must be registered redirect URIs in Google, which validates the host —
// so a spoofed Host header just fails the login rather than redirecting anywhere.
// Prod is always HTTPS (Railway/Cloudflare terminate TLS); local dev is HTTP.
function callbackUrlFor(req: Request): string {
  const proto = env.NODE_ENV === 'production' ? 'https' : 'http'
  const host = req.get('host') ?? new URL(env.BASE_URL).host
  return `${proto}://${host}/api/auth/google/callback`
}

// Where to send the browser once the handshake resolves. In prod the SPA is served from
// this same origin, so relative paths ('' + '/path') keep the user on whichever host they
// came in on (www vs apex). In dev the SPA runs on the Vite origin (BASE_URL) — a different
// port from this API — so redirects must target it, otherwise the browser lands on the
// API's bare 404 ("Cannot GET /") instead of the app.
const appBase = env.NODE_ENV === 'production' ? '' : env.BASE_URL

router.get('/google', (req, res, next) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({ error: 'Google OAuth is not configured on this server' })
  }
  authenticateGoogle({ scope: ['profile', 'email'], callbackURL: callbackUrlFor(req) })(
    req,
    res,
    next
  )
})

router.get(
  '/google/callback',
  (req, res, next) =>
    authenticateGoogle({
      failureRedirect: `${appBase}/login`,
      callbackURL: callbackUrlFor(req),
    })(req, res, next),
  (_req, res) => {
    res.redirect(`${appBase}/`)
  }
)

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
