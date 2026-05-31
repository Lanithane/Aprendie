import type { UserRow } from '../../../infrastructure/db/schema'
import type { LevelCode } from '../../../../shared/levels'
import type { ThemeMode } from '../../../../shared/appearance'

export type UserRole = 'admin' | 'user'

// Access-gate state (Epic 12): a new account is `pending` until the operator approves it,
// `approved` may spend the operator key, `blocked` is revoked.
export type AccessState = 'pending' | 'approved' | 'blocked'

// Whether this account may incur Anthropic spend. Admins are always allowed (so the
// operator can't lock themselves out); everyone else must be explicitly approved.
export function canSpend(user: { role: UserRole; access: AccessState }): boolean {
  return user.role === 'admin' || user.access === 'approved'
}

export interface UserView {
  id: string
  email: string
  name: string
  role: UserRole
  access: AccessState
  hasApiKey: boolean
  level: LevelCode | null
  themeId: string | null
  themeMode: ThemeMode | null
  learnLanguage: string | null
  guessLanguage: string | null
  locale: string | null
}

// Admin-facing projection of another user. Never exposes encryptedAnthropicKey.
// `totalCostUsd` is added once Epic 6 (usage showback) lands.
export interface AdminUserView {
  id: string
  email: string
  name: string
  role: UserRole
  access: AccessState
  hasApiKey: boolean
  createdAt: string
}

export function toUserView(row: UserRow): UserView {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    access: row.access,
    hasApiKey: Boolean(row.encryptedAnthropicKey),
    level: row.level ?? null,
    themeId: row.themeId ?? null,
    themeMode: row.themeMode ?? null,
    learnLanguage: row.learnLanguage ?? null,
    guessLanguage: row.guessLanguage ?? null,
    locale: row.locale ?? null,
  }
}

export function toAdminUserView(row: UserRow): AdminUserView {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    access: row.access,
    hasApiKey: Boolean(row.encryptedAnthropicKey),
    createdAt: row.createdAt.toISOString(),
  }
}
