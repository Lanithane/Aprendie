import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { env } from './env'
import { sessionMiddleware } from './infrastructure/session/sessionMiddleware'
import { passport } from './modules/auth/application/passport'
import { errorHandler } from './infrastructure/http/errorHandler'
import authController from './modules/auth/controllers/authController'
import userController from './modules/user/controllers/userController'
import apiKeyController from './modules/apiKey/controllers/apiKeyController'
import sentenceController from './modules/sentence/controllers/sentenceController'
import correctionController from './modules/correction/controllers/correctionController'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.set('trust proxy', 1)
app.use(express.json())

app.use(sessionMiddleware)
app.use(passport.initialize())
app.use(passport.session())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'guess-and-correct', ts: new Date().toISOString() })
})
app.use('/api/auth', authController)
app.use('/api/me', userController)
app.use('/api/key', apiKeyController)
app.use('/api/sentence', sentenceController)
app.use('/api/correct', correctionController)

if (env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '..', 'dist')
  app.use(express.static(clientDist))
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

app.use(errorHandler)

app.listen(env.PORT, () => {
  console.log(`[server] listening on :${env.PORT} (${env.NODE_ENV})`)
})
