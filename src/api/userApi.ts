import { api } from './client'

export type UserRole = 'admin' | 'user'

export interface CurrentUserDto {
  id: string
  email: string
  name: string
  role: UserRole
  hasApiKey: boolean
}

export function fetchCurrentUser(): Promise<CurrentUserDto> {
  return api<CurrentUserDto>('/api/me')
}
