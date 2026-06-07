import type { UserRow } from '../../../infrastructure/db/schema'
import * as settingsRepository from '../persistence/settingsRepository'
import { toSettingsView, type AppSettings } from '../domain/Settings'
import { SpendPausedError } from '../domain/errors'

// The settings row is a read-mostly singleton hit on every spend path — grading alone reads it
// up to three times per submission (the spend gate plus two cap lookups). Cache it in-process for
// a short window so those collapse to one DB round-trip. `updateSettings` refreshes the cache with
// the new value so the admin sees their change at once; the TTL bounds cross-instance staleness
// (a flipped spendPaused / cap propagates within TTL_MS on other instances).
const TTL_MS = 5_000
let cache: { value: AppSettings; at: number } | null = null

export async function getSettings(): Promise<AppSettings> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value
  const value = toSettingsView(await settingsRepository.get())
  cache = { value, at: Date.now() }
  return value
}

export async function updateSettings(
  patch: settingsRepository.SettingsPatch
): Promise<AppSettings> {
  const value = toSettingsView(await settingsRepository.update(patch))
  cache = { value, at: Date.now() }
  return value
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
