import { api } from './client'
import type { UserRole } from './userApi'
import type { HistoryPageDto } from './historyApi'

export interface AdminUser {
  id: string
  email: string
  name: string
  role: UserRole
  hasApiKey: boolean
  createdAt: string
}

export interface RevalidateResult {
  ok: boolean
  reason?: string
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

export function revokeUserKey(id: string): Promise<void> {
  return api<void>(`/api/admin/users/${id}/key`, { method: 'DELETE' })
}

export function revalidateUserKey(id: string): Promise<RevalidateResult> {
  return api<RevalidateResult>(`/api/admin/users/${id}/key/revalidate`, { method: 'POST' })
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
