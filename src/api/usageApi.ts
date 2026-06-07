import { api } from './client'

// The signed-in learner's own daily-cap posture. Mirrors the server's DailyUsageSnapshot: `capped`
// is false for admins and temporarily-exempt accounts (the UI hides the banner for them).
export interface DailyUsageDto {
  usedToday: number
  cap: number
  capped: boolean
}

export function fetchDailyUsage(): Promise<DailyUsageDto> {
  return api<DailyUsageDto>('/api/usage/me')
}
