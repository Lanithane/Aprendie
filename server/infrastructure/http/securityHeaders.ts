import type { Request, Response, NextFunction } from 'express'
import { env } from '../../env'

// One year, in seconds. Long max-age is required for HSTS preload eligibility.
const ONE_YEAR = 60 * 60 * 24 * 365

// In production: redirect plain-HTTP requests to HTTPS before anything else,
// then set HSTS so browsers remember to use HTTPS directly on future visits.
// trust proxy is set on the app so req.protocol reflects X-Forwarded-Proto.
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  if (env.NODE_ENV === 'production') {
    if (req.protocol === 'http') {
      return res.redirect(301, `https://${req.hostname}${req.originalUrl}`)
    }
    res.setHeader('Strict-Transport-Security', `max-age=${ONE_YEAR}; includeSubDomains`)
  }
  next()
}
