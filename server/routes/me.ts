import { Router } from 'express'
import type { User } from '../db/schema'
import { requireAuth } from '../middleware/requireAuth'

const router = Router()

router.get('/', requireAuth, (req, res) => {
  const user = req.user as User
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    hasApiKey: Boolean(user.encryptedAnthropicKey),
  })
})

export default router
