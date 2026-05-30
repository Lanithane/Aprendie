import type { UserRow } from '../../../infrastructure/db/schema'
import type { LevelCode } from '../../../../shared/levels'
import type { ThemeMode } from '../../../../shared/appearance'

export type UserRole = 'admin' | 'user'

export interface UserView {
  id: string
  email: string
  name: string
  role: UserRole
  hasApiKey: boolean
  level: LevelCode | null
  themeId: string | null
  themeMode: ThemeMode | null
}

// Admin-facing projection of another user. Never exposes encryptedAnthropicKey.
// `totalCostUsd` is added once Epic 6 (usage showback) lands.
export interface AdminUserView {
  id: string
  email: string
  name: string
  role: UserRole
  hasApiKey: boolean
  createdAt: string
}

export function toUserView(row: UserRow): UserView {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    hasApiKey: Boolean(row.encryptedAnthropicKey),
    level: row.level ?? null,
    themeId: row.themeId ?? null,
    themeMode: row.themeMode ?? null,
  }
}

export function toAdminUserView(row: UserRow): AdminUserView {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    hasApiKey: Boolean(row.encryptedAnthropicKey),
    createdAt: row.createdAt.toISOString(),
  }
}
