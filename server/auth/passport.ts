import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { users } from '../db/schema'
import { env } from '../env'

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
        const name = profile.displayName ?? email ?? 'Unnamed'
        if (!email) {
          return done(new Error('Google profile missing email'))
        }
        const existing = await db.select().from(users).where(eq(users.googleSub, profile.id))
        if (existing.length > 0) {
          return done(null, existing[0])
        }
        const inserted = await db
          .insert(users)
          .values({ email, name, googleSub: profile.id })
          .returning()
        return done(null, inserted[0])
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
    const rows = await db.select().from(users).where(eq(users.id, id))
    if (rows.length === 0) return done(null, false)
    done(null, rows[0])
  } catch (err) {
    done(err as Error)
  }
})

export { passport }
