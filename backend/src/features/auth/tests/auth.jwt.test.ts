import { describe, expect, it } from 'bun:test'

import { JWT_SECRET, REFRESH_SECRET } from '../../../tests/helpers/secrets'
import {
  generateAccessToken,
  generateRefreshToken,
  hashJti,
  verifyAccessToken,
  verifyRefreshToken,
} from '../jwt.utils'

describe('JWT Utils', () => {
  describe('generateAccessToken / verifyAccessToken', () => {
    it('should generate and verify access token', async () => {
      const userId = crypto.randomUUID()
      const token = await generateAccessToken(userId, 'user', JWT_SECRET)
      const payload = await verifyAccessToken(token, JWT_SECRET)

      if (!payload) return

      expect(payload.sub).toBe(userId)
      expect(payload.role).toBe('user')
      expect(payload.type).toBe('access')
      expect(payload.exp).toBeGreaterThan(payload.iat)
    })

    it('should reject access token verified with wrong secret', async () => {
      const token = await generateAccessToken('user-id', 'user', JWT_SECRET)
      const payload = await verifyAccessToken(token, 'wrong-secret')
      expect(payload).toBeNull()
    })

    it('should reject refresh token when verified as access', async () => {
      const { token } = await generateRefreshToken('user-id', JWT_SECRET)
      const payload = await verifyAccessToken(token, JWT_SECRET)
      expect(payload).toBeNull()
    })
  })

  describe('generateRefreshToken / verifyRefreshToken', () => {
    it('should generate and verify refresh token', async () => {
      const userId = crypto.randomUUID()
      const { token, jti, expiresAt } = await generateRefreshToken(userId, REFRESH_SECRET)
      const payload = await verifyRefreshToken(token, REFRESH_SECRET)

      expect(payload).not.toBeNull()
      if (!payload) return

      expect(payload.sub).toBe(userId)
      expect(payload.type).toBe('refresh')
      expect(payload.jti).toBe(jti)
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now())
    })

    it('should reject refresh token verified with wrong secret', async () => {
      const { token } = await generateRefreshToken('user-id', REFRESH_SECRET)
      const payload = await verifyRefreshToken(token, 'wrong-secret')
      expect(payload).toBeNull()
    })

    it('should reject access token when verified as refresh', async () => {
      const token = await generateAccessToken('user-id', 'user', REFRESH_SECRET)
      const payload = await verifyRefreshToken(token, REFRESH_SECRET)
      expect(payload).toBeNull()
    })

    it('should generate unique jti for each refresh token', async () => {
      const userId = crypto.randomUUID()
      const { jti: jti1 } = await generateRefreshToken(userId, REFRESH_SECRET)
      const { jti: jti2 } = await generateRefreshToken(userId, REFRESH_SECRET)
      expect(jti1).not.toBe(jti2)
    })
  })

  describe('hashJti', () => {
    it('should produce consistent hash for same jti', () => {
      const jti = crypto.randomUUID()
      const hash1 = hashJti(jti)
      const hash2 = hashJti(jti)
      expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for different jtis', () => {
      const hash1 = hashJti(crypto.randomUUID())
      const hash2 = hashJti(crypto.randomUUID())
      expect(hash1).not.toBe(hash2)
    })

    it('should return a non-empty string', () => {
      const result = hashJti(crypto.randomUUID())
      expect(result).toBeString()
      expect(result.length).toBeGreaterThan(0)
    })
  })
})
