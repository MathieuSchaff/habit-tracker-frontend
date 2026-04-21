import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import type { Hono } from 'hono'
import { eq } from 'drizzle-orm'

import type { AppEnv } from '../../../app-env'
import { users } from '../../../db/schema'
import { testDb } from '../../../tests/db.test.config'
import { createTestApp } from '../../../tests/helpers/createTestApp'
import {
  authDelete,
  authPatch,
  authPost,
  loginAndGetToken,
  setupAndLogin,
} from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'

describe('Article Routes — GET', () => {
  let app: Hono<AppEnv>

  beforeEach(async () => {
    app = await createTestApp()
  })

  describe('GET /articles', () => {
    it('returns 200 with empty list when no articles exist', async () => {
      const res = await app.request('/articles')
      expect(res.status).toBe(HTTP_STATUS.OK)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.items).toBeArray()
      expect(json.data.total).toBe(0)
    })

    it('filters by category', async () => {
      const res = await app.request('/articles?category=skincare')
      expect(res.status).toBe(HTTP_STATUS.OK)
      const json = await res.json()
      expect(json.success).toBe(true)
    })

    it('returns only published articles by default', async () => {
      const res = await app.request('/articles')
      expect(res.status).toBe(HTTP_STATUS.OK)
      const json = await res.json()
      for (const item of json.data.items) {
        expect(item.publishedAt).not.toBeNull()
      }
    })
  })

  describe('GET /articles/:slug', () => {
    it('returns 404 for unknown slug', async () => {
      const res = await app.request('/articles/unknown-slug')
      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })
  })
})

const VALID_ARTICLE = {
  title: 'Guide complet : acné',
  category: 'skincare',
  content: '## Introduction\n\nContenu de test.',
  excerpt: "Un guide sur l'acné.",
  publishedAt: new Date('2026-01-01').toISOString(),
}

describe('Article Routes — Write (admin only)', () => {
  let app: Hono<AppEnv>

  beforeEach(async () => {
    app = await createTestApp()
  })

  describe('POST /articles', () => {
    it('returns 403 for non-admin user', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const res = await authPost(app, '/articles', token, VALID_ARTICLE)
      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN)
    })

    it('returns 401 without token', async () => {
      const res = await app.request('/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_ARTICLE),
      })
      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('creates article as admin', async () => {
      // Create the user first, elevate role, then log in so the JWT carries role=admin
      await setupAndLogin(app, TEST_CREDENTIALS.toto)
      await testDb
        .update(users)
        .set({ role: 'admin' })
        .where(eq(users.email, TEST_CREDENTIALS.toto.email))
      const token = await loginAndGetToken(app, TEST_CREDENTIALS.toto.rawEmail, TEST_CREDENTIALS.toto.rawPassword)

      const res = await authPost(app, '/articles', token, VALID_ARTICLE)
      expect(res.status).toBe(HTTP_STATUS.CREATED)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.data.slug).toBe('guide-complet-acne')
      expect(json.data.category).toBe('skincare')
    })
  })

  describe('PATCH /articles/:slug', () => {
    it('returns 403 for non-admin', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const res = await authPatch(app, '/articles/some-slug', token, { title: 'Nouveau titre' })
      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN)
    })

    it('returns 404 when article does not exist (admin)', async () => {
      // Create the user first, elevate role, then log in so the JWT carries role=admin
      await setupAndLogin(app, TEST_CREDENTIALS.alice)
      await testDb
        .update(users)
        .set({ role: 'admin' })
        .where(eq(users.email, TEST_CREDENTIALS.alice.email))
      const token = await loginAndGetToken(app, TEST_CREDENTIALS.alice.rawEmail, TEST_CREDENTIALS.alice.rawPassword)
      const res = await authPatch(app, '/articles/nonexistent', token, { title: 'X' })
      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })
  })

  describe('DELETE /articles/:slug', () => {
    it('returns 403 for non-admin', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const res = await authDelete(app, '/articles/some-slug', token)
      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN)
    })
  })
})
