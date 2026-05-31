import { describe, it, expect } from 'vitest'
import { toUserView, toAdminUserView } from './User'
import type { UserRow } from '../../../infrastructure/db/schema'

const SECRET_BLOB = 'v2$abcdefgh$aXY=$Y3Q=$dGFn'

function fakeRow(): UserRow {
  return {
    id: 'user-1',
    email: 'a@b.com',
    name: 'A',
    googleSub: 'sub-1',
    encryptedAnthropicKey: SECRET_BLOB,
    role: 'user',
    access: 'approved',
    level: null,
    themeId: null,
    themeMode: null,
    learnLanguage: null,
    guessLanguage: null,
    locale: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  }
}

// Epic 7 leak/redaction contract: user-facing projections must never carry the
// encrypted key (nor its field name), only the boolean `hasApiKey`.
describe('user view redaction', () => {
  it('toUserView never exposes the encrypted key', () => {
    const json = JSON.stringify(toUserView(fakeRow()))
    expect(json).not.toContain(SECRET_BLOB)
    expect(json).not.toContain('encrypted')
    expect(toUserView(fakeRow()).hasApiKey).toBe(true)
  })

  it('toAdminUserView never exposes the encrypted key', () => {
    const json = JSON.stringify(toAdminUserView(fakeRow()))
    expect(json).not.toContain(SECRET_BLOB)
    expect(json).not.toContain('encrypted')
    expect(toAdminUserView(fakeRow()).hasApiKey).toBe(true)
  })
})
