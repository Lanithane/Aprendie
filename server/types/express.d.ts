import type { UserRow } from '../infrastructure/db/schema'

declare global {
  namespace Express {
    // Augments passport's `Express.User` (an empty interface) with our row shape
    // via declaration merging — the empty body is required here, not a mistake.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends UserRow {}
  }
}

export {}
