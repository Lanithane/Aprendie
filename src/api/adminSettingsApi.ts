import { api } from './client'

// Operator/site settings, mirrored from the server's `AppSettings` view.
export interface AdminSettings {
  dailyGradedCap: number
  signupsPaused: boolean
  spendPaused: boolean
  autoApproveSignups: boolean
}

export type AdminSettingsPatch = Partial<AdminSettings>

export function fetchSettings(): Promise<AdminSettings> {
  return api<AdminSettings>('/api/admin/settings')
}

export function updateSettings(patch: AdminSettingsPatch): Promise<AdminSettings> {
  return api<AdminSettings>('/api/admin/settings', {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}
