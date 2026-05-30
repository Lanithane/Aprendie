import { api } from './client'
import type { LevelCode } from '../../shared/levels'
import type { ThemeMode } from '../../shared/appearance'
import type { LanguagePair } from '../../shared/languages'

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
  learnLanguage: string | null
  guessLanguage: string | null
  locale: string | null
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

export function updateUserLanguagePair(pair: LanguagePair): Promise<CurrentUserDto> {
  return api<CurrentUserDto>('/api/me/language-pair', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pair),
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
