import type { Request, Response, NextFunction, RequestHandler } from 'express'

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>

// Wraps an async Express handler so rejected promises are forwarded to the error
// middleware (Express 4 doesn't do this automatically) and the handler satisfies
// the void-returning RequestHandler type. Handlers can `throw` to defer to the
// global errorHandler; they only catch the errors they map to specific statuses.
export function asyncHandler(handler: AsyncRequestHandler): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next)
  }
}
