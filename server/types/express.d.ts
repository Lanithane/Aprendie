import type { UserRow } from '../infrastructure/db/schema'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface User extends UserRow {}
  }
}

export {}
