import type { UserRow } from '../../../infrastructure/db/schema'
import * as settingsRepository from '../persistence/settingsRepository'
import { toSettingsView, type AppSettings } from '../domain/Settings'
import { SpendPausedError } from '../domain/errors'

export async function getSettings(): Promise<AppSettings> {
  return toSettingsView(await settingsRepository.get())
}

export async function updateSettings(
  patch: settingsRepository.SettingsPatch
): Promise<AppSettings> {
  return toSettingsView(await settingsRepository.update(patch))
}

// Guard for spend paths: throws SpendPausedError when the global maintenance pause is on.
// Admins are exempt so the operator can always test while spend is paused for everyone else.
export async function assertSpendEnabled(user: Pick<UserRow, 'role'>): Promise<void> {
  if (user.role === 'admin') return
  const { spendPaused } = await getSettings()
  if (spendPaused) throw new SpendPausedError()
}

// The cap that applies to this account: a per-user override wins over the global cap.
export async function getDailyCapFor(user: Pick<UserRow, 'dailyCapOverride'>): Promise<number> {
  if (user.dailyCapOverride != null) return user.dailyCapOverride
  return (await getSettings()).dailyGradedCap
}
