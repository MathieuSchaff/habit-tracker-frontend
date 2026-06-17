import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@aurore/shared'

import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { setupDbTests } from '../../../tests/db-setup'
import { createTestEnv, type TestClient, withAuth } from '../../../tests/helpers/createTestClient'
import { authPatch, setupAndLogin } from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'

setupDbTests()

describe('Profile Routes', () => {
  let app: Hono<AppEnv>
  let client: TestClient

  beforeEach(async () => {
    const env = await createTestEnv()
    app = env.app
    client = env.client
  })

  describe('GET /profile', () => {
    it('should return profile for authenticated user', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await client.profile.$get({}, withAuth(token))

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('expected ok')
      expect(data.data.userId).toBeDefined()
    })

    it('should return distinct profiles for different users', async () => {
      const tokenToto = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const tokenAlice = await setupAndLogin(app, TEST_CREDENTIALS.alice)

      const resToto = await client.profile.$get({}, withAuth(tokenToto))
      const resAlice = await client.profile.$get({}, withAuth(tokenAlice))

      const dataToto = await resToto.json()
      const dataAlice = await resAlice.json()

      if (!dataToto.success || !dataAlice.success) throw new Error('expected ok')
      expect(dataToto.data.userId).toBeDefined()
      expect(dataAlice.data.userId).toBeDefined()
      expect(dataToto.data.userId).not.toBe(dataAlice.data.userId)
    })

    it('should reject unauthenticated request', async () => {
      const res = await app.request('/api/profile')

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
      const data = (await res.json()) as { success: boolean }
      expect(data.success).toBe(false)
    })

    it('should reject request with invalid token', async () => {
      const res = await app.request('/api/profile', {
        headers: { Authorization: 'Bearer invalid.token.here' },
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should reject request with empty Authorization header', async () => {
      const res = await app.request('/api/profile', {
        headers: { Authorization: '' },
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should reject request with malformed Bearer token', async () => {
      const res = await app.request('/api/profile', {
        headers: { Authorization: 'Bearer' },
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should not expose sensitive fields in profile response', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await client.profile.$get({}, withAuth(token))
      const data = await res.json()
      if (!data.success) throw new Error('expected ok')

      // passwordHash / password are not in the typed response — assert via untyped lookup
      const raw = data.data as Record<string, unknown>
      expect(raw.passwordHash).toBeUndefined()
      expect(raw.password).toBeUndefined()
    })
  })

  describe('PATCH /profile', () => {
    it('should update username', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await client.profile.$patch({ json: { username: 'newname' } }, withAuth(token))

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('expected ok')
      expect(data.data.username).toBe('newname')
    })

    it('returns 409 username_taken on collision, not an unhandled 500', async () => {
      const tokenAlice = await setupAndLogin(app, TEST_CREDENTIALS.alice)
      const tokenToto = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      await client.profile.$patch({ json: { username: 'shared_name' } }, withAuth(tokenAlice))

      // Collision must surface as a clean 409 (handled), not a 500. The 500-vs-200
      // split was a username-existence oracle (incl. private profiles). The 409
      // goes through the global error handler, so it's not in the typed RPC
      // response; use a raw request to read the untyped status.
      const res = await app.request('/api/profile', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${tokenToto}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'shared_name' }),
      })

      expect(res.status).toBe(HTTP_STATUS.CONFLICT)
      const body = (await res.json()) as { error?: string }
      expect(body.error).toBe('username_taken')
    })

    it('should update bio', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await client.profile.$patch({ json: { bio: 'Hello world' } }, withAuth(token))

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('expected ok')
      expect(data.data.bio).toBe('Hello world')
    })

    it('should update avatarUrl', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await client.profile.$patch(
        { json: { avatarUrl: 'https://example.com/avatar.png' } },
        withAuth(token)
      )

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('expected ok')
      expect(data.data.avatarUrl).toBe('https://example.com/avatar.png')
    })

    it('should update multiple fields at once', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await client.profile.$patch(
        { json: { username: 'multi', bio: 'Updated bio' } },
        withAuth(token)
      )

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('expected ok')
      expect(data.data.username).toBe('multi')
      expect(data.data.bio).toBe('Updated bio')
    })

    it('should persist updates across requests', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      await client.profile.$patch({ json: { username: 'persisted' } }, withAuth(token))

      const res = await client.profile.$get({}, withAuth(token))
      const data = await res.json()
      if (!data.success) throw new Error('expected ok')
      expect(data.data.username).toBe('persisted')
    })

    it('should allow overwriting a previously set field', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      await client.profile.$patch({ json: { username: 'first' } }, withAuth(token))
      await client.profile.$patch({ json: { username: 'second' } }, withAuth(token))

      const res = await client.profile.$get({}, withAuth(token))
      const data = await res.json()
      if (!data.success) throw new Error('expected ok')
      expect(data.data.username).toBe('second')
    })

    it('should not affect other fields when updating one', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      await client.profile.$patch({ json: { username: 'myname', bio: 'my bio' } }, withAuth(token))
      await client.profile.$patch({ json: { username: 'updated' } }, withAuth(token))

      const res = await client.profile.$get({}, withAuth(token))
      const data = await res.json()
      if (!data.success) throw new Error('expected ok')
      expect(data.data.username).toBe('updated')
      expect(data.data.bio).toBe('my bio')
    })

    it('should not leak one user profile data to another', async () => {
      const tokenToto = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const tokenAlice = await setupAndLogin(app, TEST_CREDENTIALS.alice)

      await client.profile.$patch(
        { json: { username: 'toto_name', bio: 'toto bio' } },
        withAuth(tokenToto)
      )
      await client.profile.$patch(
        { json: { username: 'alice_name', bio: 'alice bio' } },
        withAuth(tokenAlice)
      )

      const resToto = await client.profile.$get({}, withAuth(tokenToto))
      const resAlice = await client.profile.$get({}, withAuth(tokenAlice))
      const dataToto = await resToto.json()
      const dataAlice = await resAlice.json()
      if (!dataToto.success || !dataAlice.success) throw new Error('expected ok')

      expect(dataToto.data.username).toBe('toto_name')
      expect(dataToto.data.bio).toBe('toto bio')
      expect(dataAlice.data.username).toBe('alice_name')
      expect(dataAlice.data.bio).toBe('alice bio')
    })

    // Validator failures return 400 via middleware, not in the typed response.
    it('should reject empty username', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const res = await authPatch(app, '/api/profile', token, { username: '' })
      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject username over 32 chars', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const res = await authPatch(app, '/api/profile', token, { username: 'a'.repeat(33) })
      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should accept username at exactly 32 chars', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const res = await client.profile.$patch(
        { json: { username: 'a'.repeat(32) } },
        withAuth(token)
      )
      expect(res.status).toBe(HTTP_STATUS.OK)
    })

    it('should reject bio over 500 chars', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const res = await authPatch(app, '/api/profile', token, { bio: 'a'.repeat(501) })
      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should accept bio at exactly 500 chars', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const res = await client.profile.$patch({ json: { bio: 'a'.repeat(500) } }, withAuth(token))
      expect(res.status).toBe(HTTP_STATUS.OK)
    })

    it('should reject invalid avatarUrl', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const res = await authPatch(app, '/api/profile', token, { avatarUrl: 'not-a-url' })
      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject unknown fields (strict mode)', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const res = await authPatch(app, '/api/profile', token, { hackerField: 'oops' })
      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject unauthenticated request', async () => {
      const res = await app.request('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'nope' }),
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should reject request with invalid token', async () => {
      const res = await authPatch(app, '/api/profile', 'invalid.token.here', { username: 'nope' })
      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    // Defense-in-depth: profileUpdateSchema is .strict() so the route layer
    // already rejects unknown keys with 400. This service-level test bypasses
    // zod to lock the explicit whitelist in updateProfile — a future schema
    // loosen-up must not become a moderation-flag escalation.
    it('updateProfile service ignores moderation columns when called with extras', async () => {
      const { eq } = await import('drizzle-orm')
      const { profiles } = await import('../../../db/schema/auth/users')
      const { testDb } = await import('../../../tests/db.test.config')
      const { updateProfile } = await import('../service')
      const { createTestUser } = await import('../../../tests/helpers/test-factories')

      const user = await createTestUser('wl-attacker@test.local', 'Azerty123!')

      // Simulates a future schema regression that lets extra keys through.
      // Cast through unknown so the call type-checks; the service MUST drop
      // the unwhitelisted keys at runtime.
      type ProfileUpdateInput = Parameters<typeof updateProfile>[2]
      const malicious = {
        username: 'attacker-name',
        forcedPrivateByAdmin: false,
        forcedPrivateReason: 'cleared by attacker',
        profilePublic: true,
      } as unknown as ProfileUpdateInput

      await updateProfile(testDb, user.id, malicious)

      const [row] = await testDb
        .select({
          username: profiles.username,
          forcedPrivateByAdmin: profiles.forcedPrivateByAdmin,
          forcedPrivateReason: profiles.forcedPrivateReason,
          profilePublic: profiles.profilePublic,
        })
        .from(profiles)
        .where(eq(profiles.userId, user.id))

      // Whitelisted field flows through.
      expect(row?.username).toBe('attacker-name')
      // Moderation + privacy flags untouched (defaults from signup).
      expect(row?.forcedPrivateByAdmin).toBe(false) // default false, but attacker tried to confirm-clear; semantically untouched
      expect(row?.forcedPrivateReason).toBeNull()
      expect(row?.profilePublic).toBe(false) // signup default — proves the malicious 'true' did not land
    })
  })

  describe('GET /profile/stats', () => {
    it('returns zeroed stats for a new user', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await client.profile.stats.$get({}, withAuth(token))

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('expected ok')
      expect(data.data.totalProducts).toBe(0)
    })

    it('rejects unauthenticated request', async () => {
      const res = await app.request('/api/profile/stats')
      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('GET /profile/preferences', () => {
    it('returns default preferences for a new user', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await client.profile.preferences.$get({}, withAuth(token))

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('expected ok')
      expect(data.data.displayScale).toBe('out_of_20')
      expect(data.data.criteriaWeights).toBeDefined()
      expect(data.data.criteriaWeights.tolerance).toBe(1)
    })

    it('rejects unauthenticated request', async () => {
      const res = await app.request('/api/profile/preferences')
      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('PATCH /profile/preferences', () => {
    it('updates displayScale', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await client.profile.preferences.$patch(
        { json: { displayScale: 'out_of_10' } },
        withAuth(token)
      )

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('expected ok')
      expect(data.data.displayScale).toBe('out_of_10')
    })

    it('updates criteriaWeights and merges with existing values', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await client.profile.preferences.$patch(
        { json: { criteriaWeights: { tolerance: 8, efficacy: 3 } } },
        withAuth(token)
      )
      const data = await res.json()
      if (!data.success) throw new Error('expected ok')
      expect(data.data.criteriaWeights.tolerance).toBe(8)
      expect(data.data.criteriaWeights.efficacy).toBe(3)
    })

    it('persists changes across requests', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      await client.profile.preferences.$patch(
        { json: { displayScale: 'percentage' } },
        withAuth(token)
      )

      const res = await client.profile.preferences.$get({}, withAuth(token))
      const data = await res.json()
      if (!data.success) throw new Error('expected ok')
      expect(data.data.displayScale).toBe('percentage')
    })

    it('rejects invalid displayScale', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const res = await authPatch(app, '/api/profile/preferences', token, {
        displayScale: 'out_of_100',
      })
      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('rejects weight outside 0-10 range', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const res = await authPatch(app, '/api/profile/preferences', token, {
        criteriaWeights: { tolerance: 11 },
      })
      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('rejects unauthenticated request', async () => {
      const res = await app.request('/api/profile/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayScale: 'out_of_10' }),
      })
      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })
})
