import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { createTestApp } from '../../../tests/helpers/createTestApp'
import { authGet, authPatch, setupAndLogin } from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'

describe('Profile Routes', () => {
  let app: Hono<AppEnv>

  beforeEach(async () => {
    app = await createTestApp()
  })

  describe('GET /profile', () => {
    it('should return profile for authenticated user', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authGet(app, '/profile', token)

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.userId).toBeDefined()
    })

    it('should return distinct profiles for different users', async () => {
      const tokenToto = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const tokenAlice = await setupAndLogin(app, TEST_CREDENTIALS.alice)

      const resToto = await authGet(app, '/profile', tokenToto)
      const resAlice = await authGet(app, '/profile', tokenAlice)

      const dataToto = await resToto.json()
      const dataAlice = await resAlice.json()

      expect(dataToto.data.userId).toBeDefined()
      expect(dataAlice.data.userId).toBeDefined()
      expect(dataToto.data.userId).not.toBe(dataAlice.data.userId)
    })

    it('should reject unauthenticated request', async () => {
      const res = await app.request('/profile')

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
      const data = await res.json()
      expect(data.success).toBe(false)
    })

    it('should reject request with invalid token', async () => {
      const res = await authGet(app, '/profile', 'invalid.token.here')

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should reject request with empty Authorization header', async () => {
      const res = await app.request('/profile', {
        headers: { Authorization: '' },
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should reject request with malformed Bearer token', async () => {
      const res = await app.request('/profile', {
        headers: { Authorization: 'Bearer' },
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should not expose sensitive fields in profile response', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authGet(app, '/profile', token)
      const data = await res.json()

      expect(data.data.passwordHash).toBeUndefined()
      expect(data.data.password).toBeUndefined()
    })
  })

  describe('PATCH /profile', () => {
    it('should update username', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPatch(app, '/profile', token, { username: 'newname' })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.username).toBe('newname')
    })

    it('should update bio', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPatch(app, '/profile', token, { bio: 'Hello world' })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.bio).toBe('Hello world')
    })

    it('should update avatarUrl', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPatch(app, '/profile', token, {
        avatarUrl: 'https://example.com/avatar.png',
      })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.avatarUrl).toBe('https://example.com/avatar.png')
    })

    it('should update multiple fields at once', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPatch(app, '/profile', token, {
        username: 'multi',
        bio: 'Updated bio',
      })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.username).toBe('multi')
      expect(data.data.bio).toBe('Updated bio')
    })

    it('should persist updates across requests', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      await authPatch(app, '/profile', token, { username: 'persisted' })

      const res = await authGet(app, '/profile', token)
      const data = await res.json()
      expect(data.data.username).toBe('persisted')
    })

    it('should allow overwriting a previously set field', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      await authPatch(app, '/profile', token, { username: 'first' })
      await authPatch(app, '/profile', token, { username: 'second' })

      const res = await authGet(app, '/profile', token)
      const data = await res.json()
      expect(data.data.username).toBe('second')
    })

    it('should not affect other fields when updating one', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      await authPatch(app, '/profile', token, { username: 'myname', bio: 'my bio' })
      await authPatch(app, '/profile', token, { username: 'updated' })

      const res = await authGet(app, '/profile', token)
      const data = await res.json()
      expect(data.data.username).toBe('updated')
      expect(data.data.bio).toBe('my bio')
    })

    it('should not leak one user profile data to another', async () => {
      const tokenToto = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const tokenAlice = await setupAndLogin(app, TEST_CREDENTIALS.alice)

      await authPatch(app, '/profile', tokenToto, { username: 'toto_name', bio: 'toto bio' })
      await authPatch(app, '/profile', tokenAlice, { username: 'alice_name', bio: 'alice bio' })

      const resToto = await authGet(app, '/profile', tokenToto)
      const resAlice = await authGet(app, '/profile', tokenAlice)
      const dataToto = await resToto.json()
      const dataAlice = await resAlice.json()

      expect(dataToto.data.username).toBe('toto_name')
      expect(dataToto.data.bio).toBe('toto bio')
      expect(dataAlice.data.username).toBe('alice_name')
      expect(dataAlice.data.bio).toBe('alice bio')
    })

    it('should reject empty username', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPatch(app, '/profile', token, { username: '' })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject username over 32 chars', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPatch(app, '/profile', token, { username: 'a'.repeat(33) })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should accept username at exactly 32 chars', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPatch(app, '/profile', token, { username: 'a'.repeat(32) })

      expect(res.status).toBe(HTTP_STATUS.OK)
    })

    it('should reject bio over 500 chars', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPatch(app, '/profile', token, { bio: 'a'.repeat(501) })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should accept bio at exactly 500 chars', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPatch(app, '/profile', token, { bio: 'a'.repeat(500) })

      expect(res.status).toBe(HTTP_STATUS.OK)
    })

    it('should reject invalid avatarUrl', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPatch(app, '/profile', token, { avatarUrl: 'not-a-url' })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject unknown fields (strict mode)', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPatch(app, '/profile', token, { hackerField: 'oops' })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject unauthenticated request', async () => {
      const res = await app.request('/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'nope' }),
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should reject request with invalid token', async () => {
      const res = await authPatch(app, '/profile', 'invalid.token.here', { username: 'nope' })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('GET /profile/stats', () => {
    it('returns zeroed stats for a new user', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authGet(app, '/profile/stats', token)

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.totalHabits).toBe(0)
      expect(data.data.totalChecks).toBe(0)
      expect(data.data.bestStreak).toBe(0)
      expect(data.data.totalProducts).toBe(0)
    })

    it('rejects unauthenticated request', async () => {
      const res = await app.request('/profile/stats')
      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('GET /profile/preferences', () => {
    it('returns default preferences for a new user', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authGet(app, '/profile/preferences', token)

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.displayScale).toBe('out_of_20')
      expect(data.data.criteriaWeights).toBeDefined()
      expect(data.data.criteriaWeights.tolerance).toBe(1)
    })

    it('rejects unauthenticated request', async () => {
      const res = await app.request('/profile/preferences')
      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('PATCH /profile/preferences', () => {
    it('updates displayScale', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPatch(app, '/profile/preferences', token, {
        displayScale: 'out_of_10',
      })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.data.displayScale).toBe('out_of_10')
    })

    it('updates criteriaWeights and merges with existing values', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPatch(app, '/profile/preferences', token, {
        criteriaWeights: { tolerance: 8, efficacy: 3 },
      })
      const data = await res.json()
      expect(data.data.criteriaWeights.tolerance).toBe(8)
      expect(data.data.criteriaWeights.efficacy).toBe(3)
    })

    it('persists changes across requests', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      await authPatch(app, '/profile/preferences', token, { displayScale: 'percentage' })

      const res = await authGet(app, '/profile/preferences', token)
      expect((await res.json()).data.displayScale).toBe('percentage')
    })

    it('rejects invalid displayScale', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPatch(app, '/profile/preferences', token, {
        displayScale: 'out_of_100',
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('rejects weight outside 0-10 range', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPatch(app, '/profile/preferences', token, {
        criteriaWeights: { tolerance: 11 },
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('rejects unauthenticated request', async () => {
      const res = await app.request('/profile/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayScale: 'out_of_10' }),
      })
      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })
})
