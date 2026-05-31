import type { UserRow } from '../../../infrastructure/db/schema'
import type { LevelCode } from '../../../../shared/levels'
import type { ThemeMode } from '../../../../shared/appearance'

export type UserRole = 'admin' | 'user'

// Access-gate state: a new account is `pending` until the operator approves it,
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
  level: LevelCode | null
  themeId: string | null
  themeMode: ThemeMode | null
  learnLanguage: string | null
  guessLanguage: string | null
  locale: string | null
}

// Admin-facing projection of another user.
export interface AdminUserView {
  id: string
  email: string
  name: string
  role: UserRole
  access: AccessState
  createdAt: string
}

export function toUserView(row: UserRow): UserView {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    access: row.access,
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
    createdAt: row.createdAt.toISOString(),
  }
}
