import type { UserRow } from '../../../infrastructure/db/schema'
import { canSpend } from '../domain/User'
import { AccessDeniedError } from '../domain/errors'

// Re-exported so other modules' use cases gate on access through the user module's
// application layer (never reaching into its domain directly).
export { canSpend }

// Guard for spend paths: throws AccessDeniedError unless the account may spend. Admins
// always pass; a `blocked` account reports as blocked, anything else (pending) as pending.
export function assertCanSpend(user: UserRow): void {
  if (canSpend(user)) return
  throw new AccessDeniedError(user.access === 'blocked' ? 'blocked' : 'pending')
}
