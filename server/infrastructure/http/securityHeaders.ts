import type { Request, Response, NextFunction } from 'express'
import { env } from '../../env'

// One year, in seconds. Long max-age is required for HSTS preload eligibility.
const ONE_YEAR = 60 * 60 * 24 * 365

// Tells browsers to only ever reach this origin over HTTPS, eliminating the
// brief "Not Secure" state when a user first hits http:// before the redirect.
// Only emitted in production: locally we serve over plain http on localhost.
export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  if (env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', `max-age=${ONE_YEAR}; includeSubDomains`)
  }
  next()
}
