import type { Request, Response, NextFunction } from 'express'
import { AccessDeniedError } from '../../modules/user/domain/errors'
import { DailyCapExceededError } from '../../modules/usage/domain/errors'

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  // Non-approved accounts can't spend the operator key. The client normally renders the
  // gate from /api/me, so this is a backstop — `code` lets it react.
  if (err instanceof AccessDeniedError) {
    return res.status(403).json({ error: err.message, code: `access_${err.access}` })
  }
  // Daily per-user spend cap reached.
  if (err instanceof DailyCapExceededError) {
    return res.status(429).json({ error: err.message, code: 'daily_cap' })
  }
  console.error('[server] unhandled error:', err)
  res.status(500).json({ error: 'internal server error' })
}
