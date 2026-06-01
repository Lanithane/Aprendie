import { Router } from 'express'
import type { UserRow } from '../../../infrastructure/db/schema'
import { requireAuth } from '../../../infrastructure/http/requireAuth'
import { asyncHandler } from '../../../infrastructure/http/asyncHandler'
import { getUserShowback } from '../application/getShowback'

const router = Router()

router.use(requireAuth)

// The signed-in account's cumulative usage showback (cost + token totals + sustainability
// estimate). Read by the sidebar/settings "contribute" section.
router.get(
  '/me',
  asyncHandler(async (req, res) => {
    res.json(await getUserShowback((req.user as UserRow).id))
  })
)

export default router
