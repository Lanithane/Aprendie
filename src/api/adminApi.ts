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

export function fetchUserHistory(id: string, cursor?: string): Promise<HistoryPageDto> {
  const search = new URLSearchParams()
  if (cursor) search.set('cursor', cursor)
  const qs = search.toString()
  return api<HistoryPageDto>(`/api/admin/users/${id}/history${qs ? `?${qs}` : ''}`)
}

export function deleteUser(id: string): Promise<void> {
  return api<void>(`/api/admin/users/${id}`, { method: 'DELETE' })
}
