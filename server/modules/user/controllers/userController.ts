import { Router } from 'express'
import type { UserRow } from '../../../infrastructure/db/schema'
import { requireAuth } from '../../../infrastructure/http/requireAuth'
import { toUserView } from '../domain/User'

const router = Router()

router.get('/', requireAuth, (req, res) => {
  res.json(toUserView(req.user as UserRow))
})

export default router
