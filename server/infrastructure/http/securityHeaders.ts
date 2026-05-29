import type { Request, Response, NextFunction } from 'express'
import { env } from '../../env'

// required for HSTS preload eligibility
const ONE_YEAR = 60 * 60 * 24 * 365

// req.protocol works here because trust proxy:1 promotes X-Forwarded-Proto.
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  if (env.NODE_ENV === 'production') {
    if (req.protocol === 'http') {
      return res.redirect(301, `https://${req.hostname}${req.originalUrl}`)
    }
    res.setHeader('Strict-Transport-Security', `max-age=${ONE_YEAR}; includeSubDomains`)
  }
  next()
}
