import express from 'express'
import compression from 'compression'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { env } from './env'
import { sessionMiddleware } from './infrastructure/session/sessionMiddleware'
import { passport } from './modules/auth/application/passport'
import { errorHandler } from './infrastructure/http/errorHandler'
import { securityHeaders } from './infrastructure/http/securityHeaders'
import authController from './modules/auth/controllers/authController'
import userController from './modules/user/controllers/userController'
import adminUserController from './modules/user/controllers/adminUserController'
import adminSettingsController from './modules/settings/controllers/adminSettingsController'
import sentenceController from './modules/sentence/controllers/sentenceController'
import correctionController from './modules/correction/controllers/correctionController'
import historyController from './modules/history/controllers/historyController'
import pokedexController from './modules/pokedex/controllers/pokedexController'
import languageController from './modules/language/controllers/languageController'
import translatorController from './modules/translator/controllers/translatorController'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.set('trust proxy', 1)
app.use(compression())
app.use(securityHeaders)
app.use(express.json())

app.use(sessionMiddleware)
app.use(passport.initialize())
app.use(passport.session())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'aprendie', ts: new Date().toISOString() })
})
app.use('/api/auth', authController)
app.use('/api/me', userController)
app.use('/api/admin/users', adminUserController)
app.use('/api/admin/settings', adminSettingsController)
app.use('/api/sentence', sentenceController)
app.use('/api/correct', correctionController)
app.use('/api/history', historyController)
app.use('/api/pokedex', pokedexController)
app.use('/api/language', languageController)
app.use('/api/translate', translatorController)

if (env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '..', 'dist')
  // Vite content-hashes everything under /assets, so those are safe to cache
  // forever; index.html and other root files stay revalidated so a deploy is
  // picked up on the next load.
  const assetsDir = `${path.sep}assets${path.sep}`
  app.use(
    express.static(clientDist, {
      setHeaders: (res, filePath) => {
        res.setHeader(
          'Cache-Control',
          filePath.includes(assetsDir) ? 'public, max-age=31536000, immutable' : 'no-cache'
        )
      },
    })
  )
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache')
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

app.use(errorHandler)

app.listen(env.PORT, () => {
  console.log(`[server] listening on :${env.PORT} (${env.NODE_ENV})`)
})
