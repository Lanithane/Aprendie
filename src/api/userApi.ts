import { api } from './client'

export interface CurrentUserDto {
  id: string
  email: string
  name: string
  hasApiKey: boolean
}

export function fetchCurrentUser(): Promise<CurrentUserDto> {
  return api<CurrentUserDto>('/api/me')
}
