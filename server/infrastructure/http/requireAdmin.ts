import type { Request, Response, NextFunction } from 'express'

// Composes after requireAuth: assumes req.user is already populated.
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.user
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'forbidden' })
  }
  next()
}
