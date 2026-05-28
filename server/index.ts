import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = Number(process.env.PORT ?? 3000)
const NODE_ENV = process.env.NODE_ENV ?? 'development'

const app = express()
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'guess-and-correct', ts: new Date().toISOString() })
})

// In production, serve the built frontend.
if (NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '..', 'dist')
  app.use(express.static(clientDist))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`[server] listening on :${PORT} (${NODE_ENV})`)
})
