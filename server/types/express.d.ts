import type { User as DbUser } from '../db/schema'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface User extends DbUser {}
  }
}

export {}
