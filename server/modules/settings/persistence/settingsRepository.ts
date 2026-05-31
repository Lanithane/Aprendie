import { eq } from 'drizzle-orm'
import { db } from '../../../infrastructure/db/client'
import { appSettings, type AppSettingsRow } from '../../../infrastructure/db/schema'

// The settings row is a singleton at id = 1 (seeded by migration 0012). `get()` falls back
// to inserting defaults if the row is somehow missing, so callers never get null.
const SETTINGS_ID = 1

export async function get(): Promise<AppSettingsRow> {
  const rows = await db.select().from(appSettings).where(eq(appSettings.id, SETTINGS_ID))
  if (rows[0]) return rows[0]
  const inserted = await db
    .insert(appSettings)
    .values({ id: SETTINGS_ID })
    .onConflictDoNothing()
    .returning()
  return (
    inserted[0] ?? (await db.select().from(appSettings).where(eq(appSettings.id, SETTINGS_ID)))[0]
  )
}

export interface SettingsPatch {
  dailyGradedCap?: number
  signupsPaused?: boolean
  spendPaused?: boolean
  autoApproveSignups?: boolean
}

export async function update(patch: SettingsPatch): Promise<AppSettingsRow> {
  const updated = await db
    .update(appSettings)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(appSettings.id, SETTINGS_ID))
    .returning()
  return updated[0]
}
