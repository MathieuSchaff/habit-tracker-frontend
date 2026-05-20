import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { createTestEnv, type TestClient, withAuth } from '../../../tests/helpers/createTestClient'
import { authPatch, setupAndLogin } from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'

describe('Dermo Profile Routes', () => {
  let app: Hono<AppEnv>
  let client: TestClient

  beforeEach(async () => {
    const env = await createTestEnv()
    app = env.app
    client = env.client
  })

  describe('GET /profile/dermo', () => {
    it('should return null for a new user', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const res = await client.profile.dermo.$get({}, withAuth(token))
      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('expected ok')
      expect(data.data).toBeNull()
    })

    it('should reject unauthenticated request', async () => {
      const res = await app.request('/profile/dermo')
      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('PATCH /profile/dermo', () => {
    it('should create dermo profile on first patch', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const res = await client.profile.dermo.$patch(
        {
          json: {
            skinTypes: ['peau-seche', 'peau-sensible'],
            fitzpatrickType: 2,
            skinConcerns: ['rosacee', 'deshydratation'],
            privateNotes: 'Reacts to fragrances',
          },
        },
        withAuth(token)
      )
      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('expected ok')
      expect(data.data.skinTypes).toEqual(['peau-seche', 'peau-sensible'])
      expect(data.data.fitzpatrickType).toBe(2)
      expect(data.data.skinConcerns).toEqual(['rosacee', 'deshydratation'])
      expect(data.data.privateNotes).toBe('Reacts to fragrances')
    })

    it('should persist dermo profile across requests', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      await client.profile.dermo.$patch({ json: { skinTypes: ['peau-grasse'] } }, withAuth(token))
      const res = await client.profile.dermo.$get({}, withAuth(token))
      const data = await res.json()
      if (!data.success) throw new Error('expected ok')
      expect(data.data?.skinTypes).toEqual(['peau-grasse'])
    })

    it('should update only provided fields on subsequent patch', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      await client.profile.dermo.$patch(
        {
          json: {
            skinTypes: ['peau-seche'],
            skinConcerns: ['anti-acne'],
          },
        },
        withAuth(token)
      )
      await client.profile.dermo.$patch({ json: { fitzpatrickType: 3 } }, withAuth(token))
      const res = await client.profile.dermo.$get({}, withAuth(token))
      const data = await res.json()
      if (!data.success) throw new Error('expected ok')
      expect(data.data?.skinTypes).toEqual(['peau-seche'])
      expect(data.data?.skinConcerns).toEqual(['anti-acne'])
      expect(data.data?.fitzpatrickType).toBe(3)
    })

    // zValidator failures return 400 from middleware, which isn't reflected
    // in the typed response — fall back to authPatch for these.
    it('should reject more than 3 skin types', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const res = await authPatch(app, '/profile/dermo', token, {
        skinTypes: ['dry', 'oily', 'combination', 'sensitive'],
      })
      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject an invalid skin type', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const res = await authPatch(app, '/profile/dermo', token, {
        skinTypes: ['unknown_type'],
      })
      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject fitzpatrickType below 1', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const res = await authPatch(app, '/profile/dermo', token, { fitzpatrickType: 0 })
      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject fitzpatrickType above 6', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const res = await authPatch(app, '/profile/dermo', token, { fitzpatrickType: 7 })
      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject an invalid skin concern', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const res = await authPatch(app, '/profile/dermo', token, {
        skinConcerns: ['unknown_concern'],
      })
      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject unknown fields (strict mode)', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const res = await authPatch(app, '/profile/dermo', token, { hackerField: 'oops' })
      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should not leak dermo data between users', async () => {
      const tokenToto = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const tokenAlice = await setupAndLogin(app, TEST_CREDENTIALS.alice)
      await client.profile.dermo.$patch(
        { json: { skinTypes: ['peau-seche'] } },
        withAuth(tokenToto)
      )
      await client.profile.dermo.$patch(
        { json: { skinTypes: ['peau-grasse'] } },
        withAuth(tokenAlice)
      )
      const resToto = await client.profile.dermo.$get({}, withAuth(tokenToto))
      const resAlice = await client.profile.dermo.$get({}, withAuth(tokenAlice))
      const dataToto = await resToto.json()
      const dataAlice = await resAlice.json()
      if (!dataToto.success || !dataAlice.success) throw new Error('expected ok')
      expect(dataToto.data?.skinTypes).toEqual(['peau-seche'])
      expect(dataAlice.data?.skinTypes).toEqual(['peau-grasse'])
    })

    it('should reject unauthenticated request', async () => {
      const res = await app.request('/profile/dermo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skinTypes: ['dry'] }),
      })
      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })
})
