import { describe, it, expect } from 'vitest'
import { encrypt, decrypt } from './encryption'

// USER_A / USER_B stand in for two users' primary keys (the `aad`).
const USER_A = '11111111-1111-1111-1111-111111111111'
const USER_B = '22222222-2222-2222-2222-222222222222'
const SECRET = 'sk-ant-super-secret-key-value'

describe('encryption', () => {
  it('round-trips a value bound to its aad', () => {
    const blob = encrypt(SECRET, USER_A)
    expect(decrypt(blob, USER_A)).toBe(SECRET)
  })

  it('writes the current v3 format', () => {
    const parts = encrypt(SECRET, USER_A).split('$')
    expect(parts).toHaveLength(4)
    expect(parts[0]).toBe('v3')
  })

  it('rejects a ciphertext transplanted to another user (HKDF + AAD binding)', () => {
    const blob = encrypt(SECRET, USER_A)
    expect(() => decrypt(blob, USER_B)).toThrow()
  })

  it('rejects tampered ciphertext', () => {
    const parts = encrypt(SECRET, USER_A).split('$')
    const ct = Buffer.from(parts[2], 'base64') // v3$iv$ciphertext$authTag
    ct[0] ^= 0xff
    parts[2] = ct.toString('base64')
    expect(() => decrypt(parts.join('$'), USER_A)).toThrow()
  })

  it('rejects malformed input', () => {
    expect(() => decrypt('not-a-valid-blob', USER_A)).toThrow(/invalid encrypted format/)
  })
})
