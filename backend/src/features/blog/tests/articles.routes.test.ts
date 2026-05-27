import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import { eq } from 'drizzle-orm'
import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { users } from '../../../db/schema'
import { testDb } from '../../../tests/db.test.config'
import { setupDbTests } from '../../../tests/db-setup'
import { createTestEnv, type TestClient, withAuth } from '../../../tests/helpers/createTestClient'
import {
  authDelete,
  authPatch,
  authPost,
  loginAndGetToken,
  setupAndLogin,
} from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'

setupDbTests()

describe('Article Routes — GET', () => {
  let app: Hono<AppEnv>
  let client: TestClient

  beforeEach(async () => {
    const env = await createTestEnv()
    app = env.app
    client = env.client
  })

  describe('GET /articles', () => {
    it('returns 200 with empty list when no articles exist', async () => {
      const res = await client.articles.$get({ query: {} })
      expect(res.status).toBe(HTTP_STATUS.OK)
      const json = await res.json()
      expect(json.success).toBe(true)
      if (!json.success) throw new Error('expected ok')
      expect(json.data.items).toBeArray()
      expect(json.data.total).toBe(0)
    })

    it('filters by category', async () => {
      const res = await client.articles.$get({ query: { category: 'skincare' } })
      expect(res.status).toBe(HTTP_STATUS.OK)
      const json = await res.json()
      expect(json.success).toBe(true)
    })

    it('returns only published articles by default', async () => {
      const res = await client.articles.$get({ query: {} })
      expect(res.status).toBe(HTTP_STATUS.OK)
      const json = await res.json()
      if (!json.success) throw new Error('expected ok')
      for (const item of json.data.items) {
        expect(item.publishedAt).not.toBeNull()
      }
    })
  })

  describe('GET /articles/:slug', () => {
    it('returns 404 for unknown slug', async () => {
      // ArticleError → 404 via globalErrorHandler, not in typed response.
      const res = await app.request('/api/articles/unknown-slug')
      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })
  })

  describe('GET /articles/categories', () => {
    it('returns zero counts for every category when DB is empty', async () => {
      const res = await client.articles.categories.$get()
      expect(res.status).toBe(HTTP_STATUS.OK)
      const json = await res.json()
      if (!json.success) throw new Error('expected ok')
      expect(json.data.skincare).toBe(0)
      expect(json.data.lifestyle).toBe(0)
      expect(json.data.routines).toBe(0)
    })
  })
})

const VALID_ARTICLE = {
  title: 'Guide complet : acné',
  category: 'skincare' as const,
  content: '## Introduction\n\nContenu de test.',
  excerpt: "Un guide sur l'acné.",
  publishedAt: new Date('2026-01-01').toISOString(),
}

describe('Article Routes — Write (admin only)', () => {
  let app: Hono<AppEnv>
  let client: TestClient

  beforeEach(async () => {
    const env = await createTestEnv()
    app = env.app
    client = env.client
  })

  describe('POST /articles', () => {
    it('returns 403 for non-admin user', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const res = await client.articles.$post({ json: VALID_ARTICLE }, withAuth(token))
      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN)
    })

    it('returns 401 without token', async () => {
      const res = await app.request('/api/articles', {
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
      const token = await loginAndGetToken(
        app,
        TEST_CREDENTIALS.toto.rawEmail,
        TEST_CREDENTIALS.toto.rawPassword
      )

      const res = await client.articles.$post({ json: VALID_ARTICLE }, withAuth(token))
      expect(res.status).toBe(HTTP_STATUS.CREATED)
      const json = await res.json()
      expect(json.success).toBe(true)
      if (!json.success) throw new Error('expected ok')
      expect(json.data.slug).toBe('guide-complet-acne')
      expect(json.data.category).toBe('skincare')
    })
  })

  describe('PATCH /articles/:slug', () => {
    it('returns 403 for non-admin', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      // Authorized middleware passes; handler returns 403 (typed) but TS infers
      // 200/403 union — use authPatch to dodge the discriminant gymnastics.
      const res = await authPatch(app, '/api/articles/some-slug', token, { title: 'Nouveau titre' })
      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN)
    })

    it('returns 404 when article does not exist (admin)', async () => {
      // Create the user first, elevate role, then log in so the JWT carries role=admin
      await setupAndLogin(app, TEST_CREDENTIALS.alice)
      await testDb
        .update(users)
        .set({ role: 'admin' })
        .where(eq(users.email, TEST_CREDENTIALS.alice.email))
      const token = await loginAndGetToken(
        app,
        TEST_CREDENTIALS.alice.rawEmail,
        TEST_CREDENTIALS.alice.rawPassword
      )
      // ArticleError → 404 via globalErrorHandler, not in typed response.
      const res = await authPatch(app, '/api/articles/nonexistent', token, { title: 'X' })
      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })
  })

  describe('DELETE /articles/:slug', () => {
    it('returns 403 for non-admin', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const res = await authDelete(app, '/api/articles/some-slug', token)
      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN)
    })
  })
})

// Quiet "unused" warnings for helpers used only in error-path tests.
void authPost
