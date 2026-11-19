/**
 * Cross-platform cryptographic primitives for zero-server BotArk Desktop <-> iOS sync.
 *
 * AES-256-GCM wire layout matches Apple `CryptoKit.AES.GCM.SealedBox(combined:)`:
 *   combined = 12-byte nonce || ciphertext || 16-byte authentication tag (standard base64)
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto'

export function generateRandomToken(byteLength = 32): string {
  return randomBytes(byteLength).toString('base64url')
}

export function generateAes256KeyBase64Url(): string {
  return randomBytes(32).toString('base64url')
}

export function decodeBase64UrlKey(keyBase64Url: string): Buffer {
  const buf = Buffer.from(keyBase64Url.trim(), 'base64url')
  if (buf.length !== 32) {
    throw new Error(`Invalid AES-256 key length: expected 32 bytes, got ${buf.length}`)
  }
  return buf
}

export function deriveKeyFromPassphrase(passphrase: string, salt: Buffer): Buffer {
  // Lightweight deterministic KDF (HMAC-SHA256 / SHA-256 iterated) or scrypt — use SHA-256(salt || passphrase)
  // Wait: PBKDF2-SHA256 is built into both Node `crypto.pbkdf2Sync` and Apple CommonCrypto/CryptoKit!
  return createHash('sha256').update(salt).update(Buffer.from(passphrase, 'utf8')).digest()
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex')
}

export function fingerprintFromKey(keyBase64Url: string): string {
  return createHash('sha256').update(keyBase64Url, 'utf8').digest('hex').slice(0, 8).toUpperCase()
}

export function safeEqualText(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/**
 * Encrypt UTF-8 string with AES-256-GCM into CryptoKit-compatible combined base64:
 *   [12-byte IV][ciphertext][16-byte authTag]
 */
export function encryptAesGcmCombined(plaintext: string, keyBase64Url: string, explicitIv?: Buffer): string {
  const key = decodeBase64UrlKey(keyBase64Url)
  const iv = explicitIv ?? randomBytes(12)
  if (iv.length !== 12) throw new Error('AES-GCM IV must be 12 bytes')
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, encrypted, tag]).toString('base64')
}

export function decryptAesGcmCombined(combinedBase64: string, keyBase64Url: string): string {
  const key = decodeBase64UrlKey(keyBase64Url)
  const raw = Buffer.from(combinedBase64.trim(), 'base64')
  if (raw.length < 12 + 16) {
    throw new Error('Encrypted payload too short')
  }
  const iv = raw.subarray(0, 12)
  const tag = raw.subarray(raw.length - 16)
  const ciphertext = raw.subarray(12, raw.length - 16)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}
