import { api } from './client'
import type { LevelCode } from '../../shared/levels'

export type UserRole = 'admin' | 'user'

export interface CurrentUserDto {
  id: string
  email: string
  name: string
  role: UserRole
  hasApiKey: boolean
  level: LevelCode | null
}

export function fetchCurrentUser(): Promise<CurrentUserDto> {
  return api<CurrentUserDto>('/api/me')
}

export function updateUserLevel(level: LevelCode | null): Promise<CurrentUserDto> {
  return api<CurrentUserDto>('/api/me/level', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level }),
  })
}
