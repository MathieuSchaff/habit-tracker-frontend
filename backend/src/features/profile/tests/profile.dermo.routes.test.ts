import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { createTestApp } from '../../../tests/helpers/createTestApp'
import { authGet, authPatch, setupAndLogin } from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'

describe('Dermo Profile Routes', () => {
  let app: Hono<AppEnv>

  beforeEach(async () => {
    app = await createTestApp()
  })

  describe('GET /profile/dermo', () => {
    it('should return null for a new user', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const res = await authGet(app, '/profile/dermo', token)
      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
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
      const res = await authPatch(app, '/profile/dermo', token, {
        skinTypes: ['dry', 'sensitive'],
        fitzpatrickType: 2,
        skinConcerns: ['rosacea', 'dehydration'],
        privateNotes: 'Reacts to fragrances',
      })
      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.data.skinTypes).toEqual(['dry', 'sensitive'])
      expect(data.data.fitzpatrickType).toBe(2)
      expect(data.data.skinConcerns).toEqual(['rosacea', 'dehydration'])
      expect(data.data.privateNotes).toBe('Reacts to fragrances')
    })

    it('should persist dermo profile across requests', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      await authPatch(app, '/profile/dermo', token, { skinTypes: ['oily'] })
      const res = await authGet(app, '/profile/dermo', token)
      const data = await res.json()
      expect(data.data.skinTypes).toEqual(['oily'])
    })

    it('should update only provided fields on subsequent patch', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      await authPatch(app, '/profile/dermo', token, {
        skinTypes: ['dry'],
        skinConcerns: ['acne'],
      })
      await authPatch(app, '/profile/dermo', token, { fitzpatrickType: 3 })
      const res = await authGet(app, '/profile/dermo', token)
      const data = await res.json()
      expect(data.data.skinTypes).toEqual(['dry'])
      expect(data.data.skinConcerns).toEqual(['acne'])
      expect(data.data.fitzpatrickType).toBe(3)
    })

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
      await authPatch(app, '/profile/dermo', tokenToto, { skinTypes: ['dry'] })
      await authPatch(app, '/profile/dermo', tokenAlice, { skinTypes: ['oily'] })
      const resToto = await authGet(app, '/profile/dermo', tokenToto)
      const resAlice = await authGet(app, '/profile/dermo', tokenAlice)
      expect((await resToto.json()).data.skinTypes).toEqual(['dry'])
      expect((await resAlice.json()).data.skinTypes).toEqual(['oily'])
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
