import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { env } from '../../../env'
import * as userRepository from '../../user/persistence/userRepository'
import { findOrCreateGoogleUser } from '../../user/application/findOrCreateGoogleUser'

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
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value
        if (!email) return done(new Error('Google profile missing email'))
        const user = await findOrCreateGoogleUser({
          googleSub: profile.id,
          email,
          name: profile.displayName ?? email,
        })
        return done(null, user)
      } catch (err) {
        return done(err as Error)
      }
    }
  )
)

passport.serializeUser((user, done) => {
  done(null, (user as { id: string }).id)
})

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await userRepository.findById(id)
    if (!user) return done(null, false)
    done(null, user)
  } catch (err) {
    done(err as Error)
  }
})

export { passport }
