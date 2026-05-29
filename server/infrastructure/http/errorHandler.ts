import type { Request, Response, NextFunction } from 'express'
import { MissingApiKeyError } from '../../modules/apiKey/domain/errors'

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof MissingApiKeyError) {
    return res.status(412).json({ error: 'No Anthropic API key configured for this user' })
  }
  console.error('[server] unhandled error:', err)
  res.status(500).json({ error: 'internal server error' })
}
