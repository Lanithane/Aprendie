import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { env } from '../../../env'
import * as userRepository from '../../user/persistence/userRepository'
import { findOrCreateGoogleUser } from '../../user/application/findOrCreateGoogleUser'
import { SignupsPausedError } from '../../settings/domain/errors'

if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
  console.warn('[auth] GOOGLE_CLIENT_ID/SECRET not set — /api/auth/google will 500')
}

passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: env.GOOGLE_CLIENT_SECRET ?? '',
      callbackURL: `${env.BASE_URL}/api/auth/google/callback`,
    },
    (_accessToken, _refreshToken, profile, done) => {
      // passport's verify callback is void-typed; run the async work in a
      // self-contained promise that signals back through `done`.
      void (async () => {
        try {
          const email = profile.emails?.[0]?.value
          if (!email) return done(new Error('Google profile missing email'))
          const user = await findOrCreateGoogleUser({
            googleSub: profile.id,
            email,
            name: profile.displayName ?? email,
          })
          done(null, user)
        } catch (err) {
          // Signups paused: treat as an auth failure (no account created) so the
          // callback's failureRedirect bounces the new user back to /login, rather
          // than surfacing a 500.
          if (err instanceof SignupsPausedError) return done(null, false)
          done(err)
        }
      })()
    }
  )
)

passport.serializeUser((user, done) => {
  done(null, (user as { id: string }).id)
})

passport.deserializeUser((id: string, done) => {
  void (async () => {
    try {
      const user = await userRepository.findById(id)
      if (!user) return done(null, false)
      done(null, user)
    } catch (err) {
      done(err)
    }
  })()
})

export { passport }
