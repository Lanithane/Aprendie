import { randomBytes, createCipheriv, createDecipheriv, hkdfSync } from 'node:crypto'
import { env } from '../../env'

// AES-256-GCM envelope encryption for per-user secrets (Anthropic API keys).
//
// On-the-wire format (all base64, '$'-separated — '$' never occurs in base64):
//   v3$iv$ciphertext$authTag
//
// Two independent bindings to the owning user id (`aad`) make a stored ciphertext
// useless anywhere but its own row:
//   - HKDF per-record subkey: the AES key is HKDF(master, salt=aad, info=HKDF_INFO),
//     so the master key never encrypts directly and each row's key is user-bound.
//   - AAD: `aad` is also fed as GCM additional authenticated data — a second binding.
// A ciphertext copied onto another user's row decrypts under a different subkey and
// fails the GCM tag — transplant is cryptographically blocked.
//
// A single master key (ENCRYPTION_KEY) is used; there is no key-rotation / legacy
// read path. To rotate the master key, null out stored keys and have users re-enter
// them — see docs/key-rotation-runbook.md.

const ALGO = 'aes-256-gcm'
const IV_BYTES = 12
const KEY_BYTES = 32
const SEP = '$'
const VERSION = 'v3'
// Domain-separation label for HKDF. Changing it invalidates every existing blob.
const HKDF_INFO = 'gac/apiKey'

let cachedKey: Buffer | null = null

function masterKey(): Buffer {
  if (cachedKey) return cachedKey
  const buf = Buffer.from(env.ENCRYPTION_KEY, 'base64')
  if (buf.length !== KEY_BYTES) {
    throw new Error(
      `[crypto] ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (got ${buf.length}). Generate with: openssl rand -base64 32`
    )
  }
  cachedKey = buf
  return buf
}

function deriveSubkey(aad: string): Buffer {
  return Buffer.from(
    hkdfSync(
      'sha256',
      masterKey(),
      Buffer.from(aad, 'utf8'),
      Buffer.from(HKDF_INFO, 'utf8'),
      KEY_BYTES
    )
  )
}

// Encrypts `plaintext`, binding the ciphertext to `aad` (the owning user id) so it
// cannot be decrypted in any other context. `aad` must be stable for the lifetime of
// the ciphertext — pass an immutable identifier (the user's primary key).
export function encrypt(plaintext: string, aad: string): string {
  const subkey = deriveSubkey(aad)
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGO, subkey, iv)
  cipher.setAAD(Buffer.from(aad, 'utf8'))
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [
    VERSION,
    iv.toString('base64'),
    ciphertext.toString('base64'),
    authTag.toString('base64'),
  ].join(SEP)
}

// Decrypts a v3 blob. `aad` must match the value used at encryption time; any auth
// failure throws — including a ciphertext presented with the wrong `aad` (a transplant
// attempt) or one written under a different master key.
export function decrypt(encoded: string, aad: string): string {
  const parts = encoded.split(SEP)
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error('[crypto] invalid encrypted format')
  }
  const [, ivB64, ctB64, tagB64] = parts
  const subkey = deriveSubkey(aad)
  const decipher = createDecipheriv(ALGO, subkey, Buffer.from(ivB64, 'base64'))
  decipher.setAAD(Buffer.from(aad, 'utf8'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]).toString(
    'utf8'
  )
}
