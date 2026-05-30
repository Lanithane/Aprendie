import { eq, count, desc } from 'drizzle-orm'
import { db } from '../../../infrastructure/db/client'
import { users, type UserRow, type NewUserRow } from '../../../infrastructure/db/schema'
import type { UserRole } from '../domain/User'
import type { LevelCode } from '../../../../shared/levels'
import type { ThemeMode } from '../../../../shared/appearance'

export async function findById(id: string): Promise<UserRow | null> {
  const rows = await db.select().from(users).where(eq(users.id, id))
  return rows[0] ?? null
}

export async function listAll(): Promise<UserRow[]> {
  return db.select().from(users).orderBy(desc(users.createdAt))
}

export async function updateRole(id: string, role: UserRole): Promise<UserRow> {
  const updated = await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning()
  return updated[0]
}

export async function countAdmins(): Promise<number> {
  const rows = await db.select({ value: count() }).from(users).where(eq(users.role, 'admin'))
  return rows[0]?.value ?? 0
}

export async function findByGoogleSub(googleSub: string): Promise<UserRow | null> {
  const rows = await db.select().from(users).where(eq(users.googleSub, googleSub))
  return rows[0] ?? null
}

export async function create(values: NewUserRow): Promise<UserRow> {
  const inserted = await db.insert(users).values(values).returning()
  return inserted[0]
}

export async function updateEncryptedApiKey(
  id: string,
  encryptedKey: string | null
): Promise<void> {
  await db
    .update(users)
    .set({ encryptedAnthropicKey: encryptedKey, updatedAt: new Date() })
    .where(eq(users.id, id))
}

export async function updateLevel(id: string, level: LevelCode | null): Promise<UserRow> {
  const updated = await db
    .update(users)
    .set({ level, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning()
  return updated[0]
}

export interface AppearancePatch {
  themeId?: string | null
  themeMode?: ThemeMode | null
}

export async function updateAppearance(id: string, patch: AppearancePatch): Promise<UserRow> {
  const set: { themeId?: string | null; themeMode?: ThemeMode | null; updatedAt: Date } = {
    updatedAt: new Date(),
  }
  if ('themeId' in patch) set.themeId = patch.themeId
  if ('themeMode' in patch) set.themeMode = patch.themeMode
  const updated = await db.update(users).set(set).where(eq(users.id, id)).returning()
  return updated[0]
}
