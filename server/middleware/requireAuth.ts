import type { Request, Response, NextFunction } from 'express'
import type { User } from '../db/schema'

export interface AuthedRequest extends Request {
  user: User
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated?.() || !req.user) {
    return res.status(401).json({ error: 'unauthenticated' })
  }
  next()
}
