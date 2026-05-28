import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto'
import { env } from '../env'

// AES-256-GCM. The master key comes from ENCRYPTION_KEY (base64-encoded 32 bytes).
// Encrypted output is encoded as `iv$ciphertext$authtag`, each base64.

const ALGO = 'aes-256-gcm'
const IV_BYTES = 12 // GCM standard
const SEPARATOR = '$'

let cachedMasterKey: Buffer | null = null
function getMasterKey(): Buffer {
  if (cachedMasterKey) return cachedMasterKey
  const buf = Buffer.from(env.ENCRYPTION_KEY, 'base64')
  if (buf.length !== 32) {
    throw new Error(
      `[crypto] ENCRYPTION_KEY must decode to 32 bytes (got ${buf.length}). Generate with: openssl rand -base64 32`
    )
  }
  cachedMasterKey = buf
  return buf
}

export function encryptApiKey(plaintext: string): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGO, getMasterKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [iv.toString('base64'), ciphertext.toString('base64'), authTag.toString('base64')].join(
    SEPARATOR
  )
}

export function decryptApiKey(encoded: string): string {
  const parts = encoded.split(SEPARATOR)
  if (parts.length !== 3) {
    throw new Error('[crypto] invalid encrypted-key format')
  }
  const [ivB64, ctB64, tagB64] = parts
  const iv = Buffer.from(ivB64, 'base64')
  const ciphertext = Buffer.from(ctB64, 'base64')
  const authTag = Buffer.from(tagB64, 'base64')
  const decipher = createDecipheriv(ALGO, getMasterKey(), iv)
  decipher.setAuthTag(authTag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plaintext.toString('utf8')
}
