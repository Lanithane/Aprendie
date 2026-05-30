import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../persistence/userRepository', () => ({
  findById: vi.fn(),
  updateEncryptedApiKey: vi.fn(),
  countAdmins: vi.fn(),
  updateRole: vi.fn(),
  listAll: vi.fn(),
}))
vi.mock('../../apiKey/application/validateApiKey', () => ({
  validateApiKey: vi.fn(),
}))

import * as userRepository from '../persistence/userRepository'
import { validateApiKey } from '../../apiKey/application/validateApiKey'
import { encrypt } from '../../../infrastructure/crypto/encryption'
import { adminRevalidateUserKey, adminRevokeUserKey } from './adminUsers'
import type { UserRow } from '../../../infrastructure/db/schema'

const USER_ID = '33333333-3333-3333-3333-333333333333'
const PLAINTEXT = 'sk-ant-admin-should-never-see-this'

function userWithKey(): UserRow {
  return {
    id: USER_ID,
    email: 'u@x.com',
    name: 'U',
    googleSub: 's',
    encryptedAnthropicKey: encrypt(PLAINTEXT, USER_ID),
    role: 'user',
    level: null,
    themeId: null,
    themeMode: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

// Epic 7 admin-boundary contract: admin paths only revoke or re-validate
// (decrypt -> ping -> discard); they never return or leak the plaintext key.
describe('admin key boundary', () => {
  it('revalidate returns only ok, never the plaintext key', async () => {
    vi.mocked(userRepository.findById).mockResolvedValue(userWithKey())
    vi.mocked(validateApiKey).mockResolvedValue(undefined)
    const result = await adminRevalidateUserKey(USER_ID)
    expect(result).toEqual({ ok: true })
    expect(JSON.stringify(result)).not.toContain(PLAINTEXT)
    // The decrypted key is fed to validateApiKey but never surfaced.
    expect(vi.mocked(validateApiKey)).toHaveBeenCalledWith(PLAINTEXT)
  })

  it('revalidate failure reason does not leak the plaintext key', async () => {
    vi.mocked(userRepository.findById).mockResolvedValue(userWithKey())
    vi.mocked(validateApiKey).mockRejectedValue(new Error('401 unauthorized'))
    const result = await adminRevalidateUserKey(USER_ID)
    expect(result.ok).toBe(false)
    expect(JSON.stringify(result)).not.toContain(PLAINTEXT)
  })

  it('revoke clears the stored key and returns nothing', async () => {
    vi.mocked(userRepository.findById).mockResolvedValue(userWithKey())
    vi.mocked(userRepository.updateEncryptedApiKey).mockResolvedValue(undefined)
    const out = await adminRevokeUserKey(USER_ID)
    expect(out).toBeUndefined()
    expect(vi.mocked(userRepository.updateEncryptedApiKey)).toHaveBeenCalledWith(USER_ID, null)
  })
})
