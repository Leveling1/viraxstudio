import { describe, expect, it } from 'vitest'
import { decryptValue, encryptValue, maskSecret, sha256 } from '../src/server/encryption.js'

const key = Buffer.alloc(32, 7).toString('base64')

describe('encryption', () => {
  it('encrypts and decrypts values symmetrically', () => {
    const encrypted = encryptValue('super-secret', key, 2)
    expect(encrypted.keyVersion).toBe(2)
    expect(decryptValue(encrypted, key)).toBe('super-secret')
  })

  it('masks long secrets without exposing the full value', () => {
    expect(maskSecret('abcd1234wxyz')).toBe('abcd...wxyz')
    expect(maskSecret('tiny')).toBe('****')
  })

  it('hashes deterministic values', () => {
    expect(sha256('owner-token')).toBe(sha256('owner-token'))
  })
})
