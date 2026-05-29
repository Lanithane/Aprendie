import { eq } from 'drizzle-orm'
import { db } from '../../../infrastructure/db/client'
import { users, type UserRow, type NewUserRow } from '../../../infrastructure/db/schema'

export async function findById(id: string): Promise<UserRow | null> {
  const rows = await db.select().from(users).where(eq(users.id, id))
  return rows[0] ?? null
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
