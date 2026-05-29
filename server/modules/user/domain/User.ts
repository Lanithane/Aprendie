import type { UserRow } from '../../../infrastructure/db/schema'

export interface UserView {
  id: string
  email: string
  name: string
  hasApiKey: boolean
}

export function toUserView(row: UserRow): UserView {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    hasApiKey: Boolean(row.encryptedAnthropicKey),
  }
}
