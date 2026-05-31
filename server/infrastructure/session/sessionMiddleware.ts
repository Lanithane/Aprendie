import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import { pool } from '../db/client'
import { env } from '../../env'

const PgSession = connectPgSimple(session)

export const sessionMiddleware = session({
  store: new PgSession({
    pool,
    tableName: 'session',
    createTableIfMissing: false,
  }),
  name: 'aprendie.sid',
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  // `rolling: true` resets the cookie's 30-day expiry on every response, so the window is
  // sliding: activity keeps the session alive and only 30 days of *inactivity* lets it
  // lapse and returns the user to /login. The client mirrors `cookie.expires` (exposed on
  // /api/me, which refreshes it each load) so it can show a "session expired" notice once
  // the window finally passes.
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    // `.aprendie.com` in prod so a login on www and on the apex share one session;
    // undefined (host-only) locally. apex↔www are same-site, so `lax` is fine.
    domain: env.COOKIE_DOMAIN,
    maxAge: 1000 * 60 * 60 * 24 * 30,
  },
})
