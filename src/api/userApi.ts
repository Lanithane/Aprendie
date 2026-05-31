import { api } from './client'
import type { LevelCode } from '../../shared/levels'
import type { ThemeMode } from '../../shared/appearance'
import type { LanguagePair } from '../../shared/languages'
import type { SentenceDto } from './sentenceApi'

export type UserRole = 'admin' | 'user'
export type AccessState = 'pending' | 'approved' | 'blocked'

export interface CurrentUserDto {
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

// GET /api/me always carries `bootstrapSentence`; it's non-null only when the call opted
// in via `{ bootstrap: true }` (the initial app load) AND the pool was warm — letting the
// client seed the first sentence without a second round trip.
export interface MeDto extends CurrentUserDto {
  bootstrapSentence: SentenceDto | null
  // Absolute expiry of the current session (epoch ms), or null if unknown. The client
  // mirrors this so it can detect an expired session and prompt the user to sign in again.
  sessionExpiresAt: number | null
}

export function fetchCurrentUser(opts?: { bootstrap?: boolean }): Promise<MeDto> {
  return api<MeDto>(`/api/me${opts?.bootstrap ? '?bootstrap=1' : ''}`)
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

export interface AutoSpeakPatch {
  autoSpeak?: boolean
  autoSpeakDelayMs?: number
}

export function updateUserAutoSpeak(patch: AutoSpeakPatch): Promise<CurrentUserDto> {
  return api<CurrentUserDto>('/api/me/auto-speak', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
}
