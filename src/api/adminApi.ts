import { api } from './client'
import type { UserRole, AccessState } from './userApi'
import type { HistoryPageDto } from './historyApi'

export interface AdminUser {
  id: string
  email: string
  name: string
  role: UserRole
  access: AccessState
  createdAt: string
  // Daily-limit posture: graded sentences used today, the cap that applies (override or
  // global), the per-user override if any, and a temporary-uncap expiry (ISO) or null.
  usedToday: number
  effectiveCap: number
  dailyCapOverride: number | null
  capExemptUntil: string | null
  // Cumulative operator-key spend on this account's behalf (Epic 6 showback), in USD.
  totalCostUsd: number
}

export function fetchUsers(): Promise<AdminUser[]> {
  return api<AdminUser[]>('/api/admin/users')
}

export function setUserRole(id: string, role: UserRole): Promise<AdminUser> {
  return api<AdminUser>(`/api/admin/users/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  })
}

export function setUserAccess(id: string, access: AccessState): Promise<AdminUser> {
  return api<AdminUser>(`/api/admin/users/${id}/access`, {
    method: 'PATCH',
    body: JSON.stringify({ access }),
  })
}

// `until` is an ISO timestamp to uncap until, or null to re-cap now.
export function setCapExempt(id: string, until: string | null): Promise<AdminUser> {
  return api<AdminUser>(`/api/admin/users/${id}/cap-exempt`, {
    method: 'PATCH',
    body: JSON.stringify({ until }),
  })
}

// `cap` is a per-user daily ceiling, or null to fall back to the global cap.
export function setCapOverride(id: string, cap: number | null): Promise<AdminUser> {
  return api<AdminUser>(`/api/admin/users/${id}/cap-override`, {
    method: 'PATCH',
    body: JSON.stringify({ cap }),
  })
}

export function fetchUserHistory(id: string, cursor?: string): Promise<HistoryPageDto> {
  const search = new URLSearchParams()
  if (cursor) search.set('cursor', cursor)
  const qs = search.toString()
  return api<HistoryPageDto>(`/api/admin/users/${id}/history${qs ? `?${qs}` : ''}`)
}

export function deleteUser(id: string): Promise<void> {
  return api<void>(`/api/admin/users/${id}`, { method: 'DELETE' })
}
