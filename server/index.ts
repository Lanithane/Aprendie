import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { env } from './env'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'guess-and-correct', ts: new Date().toISOString() })
})

// Placeholder — replaced once auth is wired (server/auth/*).
app.get('/api/me', (_req, res) => {
  res.status(401).json({ error: 'unauthenticated' })
})

if (env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '..', 'dist')
  app.use(express.static(clientDist))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

app.listen(env.PORT, () => {
  console.log(`[server] listening on :${env.PORT} (${env.NODE_ENV})`)
})
