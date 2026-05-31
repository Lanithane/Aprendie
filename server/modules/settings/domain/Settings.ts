import type { AppSettingsRow } from '../../../infrastructure/db/schema'

// Operator/site settings, projected for the admin console and read by spend paths.
export interface AppSettings {
  dailyGradedCap: number
  signupsPaused: boolean
  spendPaused: boolean
}

export function toSettingsView(row: AppSettingsRow): AppSettings {
  return {
    dailyGradedCap: row.dailyGradedCap,
    signupsPaused: row.signupsPaused,
    spendPaused: row.spendPaused,
  }
}
