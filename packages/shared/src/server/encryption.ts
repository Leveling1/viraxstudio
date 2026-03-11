import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

export type EncryptedValue = {
  cipherText: string
  iv: string
  authTag: string
  keyVersion: number
}

function getKeyFromBase64(base64Key: string) {
  const key = Buffer.from(base64Key, 'base64')
  if (key.length !== 32) {
    throw new Error('APP_ENCRYPTION_KEY must decode to 32 bytes')
  }
  return key
}

export function maskSecret(value: string | null | undefined) {
  if (!value) return null
  if (value.length <= 8) return '*'.repeat(value.length)
  return `${value.slice(0, 4)}...${value.slice(-4)}`
}

export function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

export function encryptValue(plainText: string, base64Key: string, keyVersion = 1): EncryptedValue {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', getKeyFromBase64(base64Key), iv)
  const cipherText = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return {
    cipherText: cipherText.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    keyVersion,
  }
}

export function decryptValue(payload: EncryptedValue, base64Key: string) {
  const decipher = createDecipheriv('aes-256-gcm', getKeyFromBase64(base64Key), Buffer.from(payload.iv, 'base64'))
  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'))
  const plainText = Buffer.concat([
    decipher.update(Buffer.from(payload.cipherText, 'base64')),
    decipher.final(),
  ])
  return plainText.toString('utf8')
}
