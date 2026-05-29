import type { Request, Response, NextFunction } from 'express'
import type { UserRow } from '../db/schema'

export interface AuthedRequest extends Request {
  user: UserRow
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated?.() || !req.user) {
    return res.status(401).json({ error: 'unauthenticated' })
  }
  next()
}
