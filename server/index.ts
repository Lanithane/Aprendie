import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { env } from './env'
import { sessionMiddleware } from './auth/session'
import { passport } from './auth/passport'
import authRoutes from './auth/routes'
import meRoutes from './routes/me'
import apiKeyRoutes from './routes/apiKey'
import sentenceRoutes from './routes/sentences'
import correctRoutes from './routes/correct'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.set('trust proxy', 1) // Railway is behind a proxy; required for secure cookies
app.use(express.json())

// Auth + sessions
app.use(sessionMiddleware)
app.use(passport.initialize())
app.use(passport.session())

// API routes
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'guess-and-correct', ts: new Date().toISOString() })
})
app.use('/api/auth', authRoutes)
app.use('/api/me', meRoutes)
app.use('/api/key', apiKeyRoutes)
app.use('/api/sentence', sentenceRoutes)
app.use('/api/correct', correctRoutes)

// Production: serve the built SPA for non-/api routes
if (env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '..', 'dist')
  app.use(express.static(clientDist))
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

// Error handler
app.use(
  (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[server] unhandled error:', err)
    res.status(500).json({ error: 'internal server error' })
  }
)

app.listen(env.PORT, () => {
  console.log(`[server] listening on :${env.PORT} (${env.NODE_ENV})`)
})
