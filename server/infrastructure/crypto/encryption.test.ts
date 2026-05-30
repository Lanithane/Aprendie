import { describe, it, expect } from 'vitest'
import { createCipheriv, hkdfSync, randomBytes, createHash } from 'node:crypto'
import { encrypt, decrypt, isCurrentEncoding } from './encryption'

// USER_A / USER_B stand in for two users' primary keys (the `aad`).
const USER_A = '11111111-1111-1111-1111-111111111111'
const USER_B = '22222222-2222-2222-2222-222222222222'
const SECRET = 'sk-ant-super-secret-key-value'

// Matches ENCRYPTION_KEY_PREVIOUS in vitest.config.ts (Buffer.alloc(32, 2)).
const PREV_KEY = Buffer.alloc(32, 2)
const HKDF_INFO = 'gac/apiKey/v2'

describe('encryption', () => {
  it('round-trips a value bound to its aad', () => {
    const blob = encrypt(SECRET, USER_A)
    expect(decrypt(blob, USER_A)).toBe(SECRET)
  })

  it('writes the current v2 format with a key fingerprint', () => {
    const blob = encrypt(SECRET, USER_A)
    const parts = blob.split('$')
    expect(parts).toHaveLength(5)
    expect(parts[0]).toBe('v2')
    expect(parts[1]).toMatch(/^[A-Za-z0-9_-]{8}$/) // base64url of 6 bytes
    expect(isCurrentEncoding(blob)).toBe(true)
  })

  it('rejects a ciphertext transplanted to another user (HKDF + AAD binding)', () => {
    const blob = encrypt(SECRET, USER_A)
    expect(() => decrypt(blob, USER_B)).toThrow()
  })

  it('rejects tampered ciphertext', () => {
    const parts = encrypt(SECRET, USER_A).split('$')
    const ct = Buffer.from(parts[3], 'base64')
    ct[0] ^= 0xff
    parts[3] = ct.toString('base64')
    expect(() => decrypt(parts.join('$'), USER_A)).toThrow()
  })

  it('rejects malformed input', () => {
    expect(() => decrypt('not-a-valid-blob', USER_A)).toThrow(/invalid encrypted format/)
  })

  it('decrypts a v1 legacy blob written under the previous key (rotation)', () => {
    // v1 = iv$ct$tag, master key used directly, no HKDF, no AAD.
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', PREV_KEY, iv)
    const ct = Buffer.concat([cipher.update(SECRET, 'utf8'), cipher.final()])
    const legacy = [
      iv.toString('base64'),
      ct.toString('base64'),
      cipher.getAuthTag().toString('base64'),
    ].join('$')
    expect(decrypt(legacy, USER_A)).toBe(SECRET)
    expect(isCurrentEncoding(legacy)).toBe(false)
  })

  it('decrypts a v2 blob written under the previous key and flags it stale', () => {
    const keyId = createHash('sha256')
      .update(PREV_KEY)
      .digest()
      .subarray(0, 6)
      .toString('base64url')
    const subkey = Buffer.from(
      hkdfSync('sha256', PREV_KEY, Buffer.from(USER_A), Buffer.from(HKDF_INFO), 32)
    )
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', subkey, iv)
    cipher.setAAD(Buffer.from(USER_A))
    const ct = Buffer.concat([cipher.update(SECRET, 'utf8'), cipher.final()])
    const blob = [
      'v2',
      keyId,
      iv.toString('base64'),
      ct.toString('base64'),
      cipher.getAuthTag().toString('base64'),
    ].join('$')
    expect(decrypt(blob, USER_A)).toBe(SECRET)
    expect(isCurrentEncoding(blob)).toBe(false)
  })
})
