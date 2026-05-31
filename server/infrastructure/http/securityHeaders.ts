import type { Request, Response, NextFunction } from 'express'
import { env } from '../../env'

// required for HSTS preload eligibility
const ONE_YEAR = 60 * 60 * 24 * 365

// req.protocol / req.hostname work here because trust proxy:1 promotes the
// X-Forwarded-{Proto,Host} headers.
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  if (env.NODE_ENV === 'production') {
    // Send the bare Railway origin to the real domain so the app is only ever
    // reached (and indexed) under CANONICAL_HOST. Done before the http→https
    // hop so a single redirect lands on https://<canonical>.
    if (env.CANONICAL_HOST && req.hostname.endsWith('.up.railway.app')) {
      return res.redirect(301, `https://${env.CANONICAL_HOST}${req.originalUrl}`)
    }
    if (req.protocol === 'http') {
      return res.redirect(301, `https://${req.hostname}${req.originalUrl}`)
    }
    res.setHeader('Strict-Transport-Security', `max-age=${ONE_YEAR}; includeSubDomains`)
  }
  next()
}
