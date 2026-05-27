import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { setupDbTests } from '../../../tests/db-setup'
import { createTestEnv, type TestClient, withAuth } from '../../../tests/helpers/createTestClient'
import { authPatch, setupAndLogin } from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'

setupDbTests()

describe('Privacy Settings Routes', () => {
  let app: Hono<AppEnv>
  let client: TestClient

  beforeEach(async () => {
    const env = await createTestEnv()
    app = env.app
    client = env.client
  })

  describe('GET /profile/privacy-settings', () => {
    it('returns default settings for a new user', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await client.profile['privacy-settings'].$get({}, withAuth(token))

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('expected ok')
      expect(data.data).toEqual({
        profilePublic: false,
        bioPublic: false,
        avatarPublic: false,
        linksPublic: false,
        skinTypesPublic: false,
        fitzpatrickPublic: false,
        skinConcernsPublic: false,
        aiConsent: false,
      })
    })

    it('rejects unauthenticated request', async () => {
      const res = await app.request('/api/profile/privacy-settings')
      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('returns distinct settings per user', async () => {
      const tokenToto = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const tokenAlice = await setupAndLogin(app, TEST_CREDENTIALS.alice)

      await client.profile['privacy-settings'].$patch(
        { json: { profilePublic: true } },
        withAuth(tokenToto)
      )

      const resToto = await client.profile['privacy-settings'].$get({}, withAuth(tokenToto))
      const resAlice = await client.profile['privacy-settings'].$get({}, withAuth(tokenAlice))

      const dataToto = await resToto.json()
      const dataAlice = await resAlice.json()
      if (!dataToto.success || !dataAlice.success) throw new Error('expected ok')
      expect(dataToto.data.profilePublic).toBe(true)
      expect(dataAlice.data.profilePublic).toBe(false)
    })
  })

  describe('PATCH /profile/privacy-settings', () => {
    it('updates profilePublic', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await client.profile['privacy-settings'].$patch(
        { json: { profilePublic: true } },
        withAuth(token)
      )

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('expected ok')
      expect(data.data.profilePublic).toBe(true)
    })

    it('updates aiConsent', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await client.profile['privacy-settings'].$patch(
        { json: { aiConsent: true } },
        withAuth(token)
      )

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('expected ok')
      expect(data.data.aiConsent).toBe(true)
    })

    it('updates both fields at once', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await client.profile['privacy-settings'].$patch(
        { json: { profilePublic: true, aiConsent: true } },
        withAuth(token)
      )

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('expected ok')
      expect(data.data.profilePublic).toBe(true)
      expect(data.data.aiConsent).toBe(true)
    })

    it('persists changes across requests', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      await client.profile['privacy-settings'].$patch(
        { json: { profilePublic: true } },
        withAuth(token)
      )

      const res = await client.profile['privacy-settings'].$get({}, withAuth(token))
      const data = await res.json()
      if (!data.success) throw new Error('expected ok')
      expect(data.data.profilePublic).toBe(true)
    })

    it('updating one field does not affect the other', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      await client.profile['privacy-settings'].$patch(
        { json: { aiConsent: true } },
        withAuth(token)
      )

      // PATCH response itself must carry aiConsent: true (partial update must not reset it)
      const res = await client.profile['privacy-settings'].$patch(
        { json: { profilePublic: true } },
        withAuth(token)
      )
      const data = await res.json()
      if (!data.success) throw new Error('expected ok')
      expect(data.data.aiConsent).toBe(true)
      expect(data.data.profilePublic).toBe(true)
    })

    it('rejects unknown fields (strict mode)', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPatch(app, '/api/profile/privacy-settings', token, {
        hackerField: true,
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('rejects non-boolean value', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPatch(app, '/api/profile/privacy-settings', token, {
        profilePublic: 'yes',
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('rejects unauthenticated request', async () => {
      const res = await app.request('/api/profile/privacy-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profilePublic: true }),
      })
      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('updates each profile-table sub-flag independently', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await client.profile['privacy-settings'].$patch(
        { json: { bioPublic: true, avatarPublic: true, linksPublic: true } },
        withAuth(token)
      )

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('expected ok')
      expect(data.data.bioPublic).toBe(true)
      expect(data.data.avatarPublic).toBe(true)
      expect(data.data.linksPublic).toBe(true)
      expect(data.data.profilePublic).toBe(false)
    })

    it('updates dermo sub-flags even when dermo row does not exist yet', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await client.profile['privacy-settings'].$patch(
        {
          json: {
            skinTypesPublic: true,
            fitzpatrickPublic: true,
            skinConcernsPublic: true,
          },
        },
        withAuth(token)
      )

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('expected ok')
      expect(data.data.skinTypesPublic).toBe(true)
      expect(data.data.fitzpatrickPublic).toBe(true)
      expect(data.data.skinConcernsPublic).toBe(true)
    })

    it('updates all 8 flags in a single request', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await client.profile['privacy-settings'].$patch(
        {
          json: {
            profilePublic: true,
            bioPublic: true,
            avatarPublic: true,
            linksPublic: true,
            skinTypesPublic: true,
            fitzpatrickPublic: true,
            skinConcernsPublic: true,
            aiConsent: true,
          },
        },
        withAuth(token)
      )

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('expected ok')
      expect(data.data).toEqual({
        profilePublic: true,
        bioPublic: true,
        avatarPublic: true,
        linksPublic: true,
        skinTypesPublic: true,
        fitzpatrickPublic: true,
        skinConcernsPublic: true,
        aiConsent: true,
      })
    })
  })
})
