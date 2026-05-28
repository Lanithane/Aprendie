import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import { pool } from '../db/client'
import { env } from '../env'

const PgSession = connectPgSimple(session)

export const sessionMiddleware = session({
  store: new PgSession({
    pool,
    tableName: 'session',
    // We create the table via Drizzle migrations, so don't auto-create.
    createTableIfMissing: false,
  }),
  name: 'gac.sid',
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
  },
})
