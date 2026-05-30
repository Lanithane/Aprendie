import { randomBytes, createCipheriv, createDecipheriv, hkdfSync, createHash } from 'node:crypto'
import { env } from '../../env'

// AES-256-GCM envelope encryption for per-user secrets (Anthropic API keys).
//
// Two on-the-wire formats are understood on read; writes are always v2:
//   v1 (legacy):  iv$ciphertext$authTag            — master key used directly, no binding
//   v2 (current): v2$keyId$iv$ciphertext$authTag   — per-record subkey + AAD, both bound to `aad`
// every field base64 ('$' never occurs in base64/base64url, so it is a safe separator).
//
// Hardening (Epic 7) — why two bindings to the same `aad`:
//   - HKDF per-record subkey: the master key never encrypts directly. The AES key is
//     HKDF(master, salt=aad, info=HKDF_INFO), so each record's key is bound to its `aad`
//     (the owning user id). A ciphertext copied onto another row decrypts under a
//     *different* subkey and fails the GCM tag — transplant is cryptographically blocked.
//   - AAD binding: `aad` is also fed as GCM additional authenticated data — a second,
//     independent binding to the same value (belt and suspenders; the "doubly secure").
//   - Rotation: `keyId` is a short fingerprint of the master key. ENCRYPTION_KEY and the
//     optional ENCRYPTION_KEY_PREVIOUS are both accepted on read; writes use the current
//     key. `isCurrentEncoding()` lets callers re-encrypt stale blobs on read (self-healing),
//     which is also how AAD/HKDF roll out to existing rows with no downtime.

const ALGO = 'aes-256-gcm'
const IV_BYTES = 12
const KEY_BYTES = 32
const KEY_ID_BYTES = 6
const SEP = '$'
const VERSION = 'v2'
// Domain-separation label for HKDF. Changing it invalidates every existing v2 blob.
const HKDF_INFO = 'gac/apiKey/v2'

interface MasterKey {
  id: string // fingerprint: base64url of the first KEY_ID_BYTES of sha256(key)
  key: Buffer
}

let cachedKeys: MasterKey[] | null = null

function fingerprint(key: Buffer): string {
  return createHash('sha256').update(key).digest().subarray(0, KEY_ID_BYTES).toString('base64url')
}

function parseKey(raw: string, label: string): Buffer {
  const buf = Buffer.from(raw, 'base64')
  if (buf.length !== KEY_BYTES) {
    throw new Error(
      `[crypto] ${label} must decode to ${KEY_BYTES} bytes (got ${buf.length}). Generate with: openssl rand -base64 32`
    )
  }
  return buf
}

// Current key first, then the previous key (if configured) for rotation reads.
function masterKeys(): MasterKey[] {
  if (cachedKeys) return cachedKeys
  const raw = [{ key: parseKey(env.ENCRYPTION_KEY, 'ENCRYPTION_KEY') }]
  if (env.ENCRYPTION_KEY_PREVIOUS) {
    raw.push({ key: parseKey(env.ENCRYPTION_KEY_PREVIOUS, 'ENCRYPTION_KEY_PREVIOUS') })
  }
  cachedKeys = raw.map(({ key }) => ({ id: fingerprint(key), key }))
  return cachedKeys
}

function deriveSubkey(master: Buffer, aad: string): Buffer {
  return Buffer.from(
    hkdfSync('sha256', master, Buffer.from(aad, 'utf8'), Buffer.from(HKDF_INFO, 'utf8'), KEY_BYTES)
  )
}

// Encrypts `plaintext`, binding the ciphertext to `aad` (the owning user id) so it
// cannot be decrypted in any other context. `aad` must be stable for the lifetime of
// the ciphertext — pass an immutable identifier (the user's primary key).
export function encrypt(plaintext: string, aad: string): string {
  const [current] = masterKeys()
  const subkey = deriveSubkey(current.key, aad)
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGO, subkey, iv)
  cipher.setAAD(Buffer.from(aad, 'utf8'))
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [
    VERSION,
    current.id,
    iv.toString('base64'),
    ciphertext.toString('base64'),
    authTag.toString('base64'),
  ].join(SEP)
}

// Decrypts a v1 or v2 blob. `aad` must match the value used at encryption time (v2);
// it is ignored for legacy v1 blobs, which predate binding. Throws on any auth failure
// — including a ciphertext presented with the wrong `aad` (a transplant attempt).
export function decrypt(encoded: string, aad: string): string {
  const parts = encoded.split(SEP)
  if (parts.length === 3) return decryptLegacy(parts)
  if (parts.length === 5 && parts[0] === VERSION) {
    const [, keyId, ivB64, ctB64, tagB64] = parts
    const keys = masterKeys()
    // Prefer the key whose fingerprint matches; fall back to the others (e.g. when a
    // blob was written under a key that is now ENCRYPTION_KEY_PREVIOUS).
    const ordered = [...keys.filter((k) => k.id === keyId), ...keys.filter((k) => k.id !== keyId)]
    for (const master of ordered) {
      const out = tryDecryptV2(master.key, aad, ivB64, ctB64, tagB64)
      if (out !== null) return out
    }
    throw new Error('[crypto] decryption failed: no configured key authenticates this ciphertext')
  }
  throw new Error('[crypto] invalid encrypted format')
}

// True when `encoded` is already v2 under the *current* master key — i.e. there is
// nothing to upgrade. Callers re-encrypt on read when this returns false.
export function isCurrentEncoding(encoded: string): boolean {
  const parts = encoded.split(SEP)
  return parts.length === 5 && parts[0] === VERSION && parts[1] === masterKeys()[0].id
}

function tryDecryptV2(
  master: Buffer,
  aad: string,
  ivB64: string,
  ctB64: string,
  tagB64: string
): string | null {
  try {
    const subkey = deriveSubkey(master, aad)
    const decipher = createDecipheriv(ALGO, subkey, Buffer.from(ivB64, 'base64'))
    decipher.setAAD(Buffer.from(aad, 'utf8'))
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
    return Buffer.concat([
      decipher.update(Buffer.from(ctB64, 'base64')),
      decipher.final(),
    ]).toString('utf8')
  } catch {
    return null
  }
}

function decryptLegacy(parts: string[]): string {
  const [ivB64, ctB64, tagB64] = parts
  for (const master of masterKeys()) {
    try {
      const decipher = createDecipheriv(ALGO, master.key, Buffer.from(ivB64, 'base64'))
      decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
      return Buffer.concat([
        decipher.update(Buffer.from(ctB64, 'base64')),
        decipher.final(),
      ]).toString('utf8')
    } catch {
      continue
    }
  }
  throw new Error('[crypto] decryption failed: no configured key authenticates this ciphertext')
}
