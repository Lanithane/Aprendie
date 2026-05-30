import { api } from './client'
import type { LevelCode } from '../../shared/levels'
import type { ThemeMode } from '../../shared/appearance'

export type UserRole = 'admin' | 'user'

export interface CurrentUserDto {
  id: string
  email: string
  name: string
  role: UserRole
  hasApiKey: boolean
  level: LevelCode | null
  themeId: string | null
  themeMode: ThemeMode | null
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

export interface AppearancePatch {
  themeId?: string
  themeMode?: ThemeMode
}

export function updateUserAppearance(patch: AppearancePatch): Promise<CurrentUserDto> {
  return api<CurrentUserDto>('/api/me/appearance', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
}
