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
  autoSpeak: boolean | null
  autoSpeakDelayMs: number | null
}

// Admin-facing projection of another user, including their daily-limit posture.
export interface AdminUserView {
  id: string
  email: string
  name: string
  role: UserRole
  access: AccessState
  createdAt: string
  // Graded sentences used today (UTC) and the cap that applies to this account
  // (per-user override if set, otherwise the global cap).
  usedToday: number
  effectiveCap: number
  dailyCapOverride: number | null
  // ISO timestamp of a temporary uncap, or null. The client treats a future value as "uncapped".
  capExemptUntil: string | null
  // Cumulative operator-key spend on this account's behalf (Epic 6 showback). Informational.
  totalCostUsd: number
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
    autoSpeak: row.autoSpeak ?? null,
    autoSpeakDelayMs: row.autoSpeakDelayMs ?? null,
  }
}

// Usage/cap context resolved by the application layer (today's count + the global cap).
export interface AdminUserUsage {
  usedToday: number
  globalCap: number
  totalCostUsd: number
}

export function toAdminUserView(row: UserRow, usage: AdminUserUsage): AdminUserView {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    access: row.access,
    createdAt: row.createdAt.toISOString(),
    usedToday: usage.usedToday,
    effectiveCap: row.dailyCapOverride ?? usage.globalCap,
    dailyCapOverride: row.dailyCapOverride ?? null,
    capExemptUntil: row.capExemptUntil ? row.capExemptUntil.toISOString() : null,
    totalCostUsd: usage.totalCostUsd,
  }
}
