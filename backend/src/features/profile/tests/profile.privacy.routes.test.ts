import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { createTestApp } from '../../../tests/helpers/createTestApp'
import { authGet, authPatch, setupAndLogin } from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'

describe('Privacy Settings Routes', () => {
  let app: Hono<AppEnv>

  beforeEach(async () => {
    app = await createTestApp()
  })

  describe('GET /profile/privacy-settings', () => {
    it('returns default settings for a new user', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authGet(app, '/profile/privacy-settings', token)

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.profilePublic).toBe(false)
      expect(data.data.aiConsent).toBe(false)
    })

    it('rejects unauthenticated request', async () => {
      const res = await app.request('/profile/privacy-settings')
      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('returns distinct settings per user', async () => {
      const tokenToto = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const tokenAlice = await setupAndLogin(app, TEST_CREDENTIALS.alice)

      await authPatch(app, '/profile/privacy-settings', tokenToto, { profilePublic: true })

      const resToto = await authGet(app, '/profile/privacy-settings', tokenToto)
      const resAlice = await authGet(app, '/profile/privacy-settings', tokenAlice)

      expect((await resToto.json()).data.profilePublic).toBe(true)
      expect((await resAlice.json()).data.profilePublic).toBe(false)
    })
  })

  describe('PATCH /profile/privacy-settings', () => {
    it('updates profilePublic', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPatch(app, '/profile/privacy-settings', token, { profilePublic: true })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.profilePublic).toBe(true)
    })

    it('updates aiConsent', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPatch(app, '/profile/privacy-settings', token, { aiConsent: true })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.data.aiConsent).toBe(true)
    })

    it('updates both fields at once', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPatch(app, '/profile/privacy-settings', token, {
        profilePublic: true,
        aiConsent: true,
      })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.data.profilePublic).toBe(true)
      expect(data.data.aiConsent).toBe(true)
    })

    it('persists changes across requests', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      await authPatch(app, '/profile/privacy-settings', token, { profilePublic: true })

      const res = await authGet(app, '/profile/privacy-settings', token)
      expect((await res.json()).data.profilePublic).toBe(true)
    })

    it('updating one field does not affect the other', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      await authPatch(app, '/profile/privacy-settings', token, { aiConsent: true })

      // PATCH response itself must carry aiConsent: true (partial update must not reset it)
      const res = await authPatch(app, '/profile/privacy-settings', token, { profilePublic: true })
      const data = await res.json()
      expect(data.data.aiConsent).toBe(true)
      expect(data.data.profilePublic).toBe(true)
    })

    it('rejects unknown fields (strict mode)', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPatch(app, '/profile/privacy-settings', token, { hackerField: true })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('rejects non-boolean value', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPatch(app, '/profile/privacy-settings', token, {
        profilePublic: 'yes',
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('rejects unauthenticated request', async () => {
      const res = await app.request('/profile/privacy-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profilePublic: true }),
      })
      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })
})
