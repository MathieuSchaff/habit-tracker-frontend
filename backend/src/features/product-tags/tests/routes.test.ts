import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { createTestApp } from '../../../tests/helpers/createTestApp'
import {
  authDelete,
  authPatch,
  authPost,
  setupAndLogin,
} from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'

const VALID_TAG = { name: 'Anti-âge' }

describe('Product Tag Routes', () => {
  let app: Hono<AppEnv>

  beforeEach(async () => {
    app = await createTestApp()
  })

  describe('POST /product-tags', () => {
    it('should create a tag with only a name', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPost(app, '/product-tags', token, VALID_TAG)

      expect(res.status).toBe(HTTP_STATUS.CREATED)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.id).toBeDefined()
      expect(data.data.label).toBe('Anti-âge')
      expect(data.data.slug).toBe('anti-age')
      expect(data.data.tagType).toBe('')
    })

    it('should create a tag with a category', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPost(app, '/product-tags', token, {
        name: 'Peau grasse',
        category: 'skin_type',
      })

      expect(res.status).toBe(HTTP_STATUS.CREATED)
      const data = await res.json()
      expect(data.data.label).toBe('Peau grasse')
      expect(data.data.tagType).toBe('skin_type')
    })

    it('should auto-generate slug from name', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPost(app, '/product-tags', token, { name: 'Rides et Ridules' })
      const data = await res.json()

      expect(data.data.slug).toBe('rides-et-ridules')
    })

    it('should use custom slug when provided', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPost(app, '/product-tags', token, {
        name: 'Éclat',
        slug: 'eclat-custom',
      })
      const data = await res.json()

      expect(data.data.slug).toBe('eclat-custom')
    })

    it('should store a createdAt timestamp', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPost(app, '/product-tags', token, VALID_TAG)
      const data = await res.json()

      expect(data.data.createdAt).toBeDefined()
    })

    it('should return 409 for duplicate slug', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      await authPost(app, '/product-tags', token, { name: 'Acné', slug: 'acne' })
      const res = await authPost(app, '/product-tags', token, { name: 'Acné Bis', slug: 'acne' })

      expect(res.status).toBe(HTTP_STATUS.CONFLICT)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('tag_already_exists')
    })

    it('should reject missing name', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPost(app, '/product-tags', token, { category: 'skin_type' })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject unauthenticated request', async () => {
      const res = await app.request('/product-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_TAG),
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should reject request with invalid token', async () => {
      const res = await authPost(app, '/product-tags', 'invalid.token.here', VALID_TAG)

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('GET /product-tags/:id', () => {
    it('should return the tag without auth', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await authPost(app, '/product-tags', token, VALID_TAG)
      const { data: created } = await createRes.json()

      const res = await app.request(`/product-tags/${created.id}`)

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.id).toBe(created.id)
      expect(data.data.label).toBe('Anti-âge')
    })

    it('should also work when authenticated', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await authPost(app, '/product-tags', token, VALID_TAG)
      const { data: created } = await createRes.json()

      const res = await app.request(`/product-tags/${created.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.data.id).toBe(created.id)
    })

    it('should return 404 for unknown id', async () => {
      const res = await app.request(`/product-tags/${crypto.randomUUID()}`)

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('tag_not_found')
    })

    it('should return 400 for an invalid UUID', async () => {
      const res = await app.request('/product-tags/not-a-uuid')

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })
  })

  describe('PATCH /product-tags/:id', () => {
    it('should update tag fields', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await authPost(app, '/product-tags', token, { name: 'Rides' })
      const { data: created } = await createRes.json()

      const res = await authPatch(app, `/product-tags/${created.id}`, token, {
        name: 'Rides et Ridules',
        category: 'concern',
      })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.label).toBe('Rides et Ridules')
      expect(data.data.tagType).toBe('concern')
    })

    it('should persist updates across requests', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await authPost(app, '/product-tags', token, VALID_TAG)
      const { data: created } = await createRes.json()

      await authPatch(app, `/product-tags/${created.id}`, token, { name: 'Anti-âge Pro' })

      const res = await app.request(`/product-tags/${created.id}`)
      const data = await res.json()
      expect(data.data.label).toBe('Anti-âge Pro')
    })

    it('should return 404 for unknown id', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPatch(app, `/product-tags/${crypto.randomUUID()}`, token, { name: 'X' })

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
      const data = await res.json()
      expect(data.error).toBe('tag_not_found')
    })

    it('should return 409 when updating to a conflicting slug', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      await authPost(app, '/product-tags', token, { name: 'Éclat', slug: 'eclat' })
      const r2 = await authPost(app, '/product-tags', token, { name: 'Luminosité' })
      const { data: t2 } = await r2.json()

      const res = await authPatch(app, `/product-tags/${t2.id}`, token, {
        name: 'Éclat',
        slug: 'eclat',
      })

      expect(res.status).toBe(HTTP_STATUS.CONFLICT)
      const data = await res.json()
      expect(data.error).toBe('tag_already_exists')
    })

    it('should reject unauthenticated request', async () => {
      const res = await app.request(`/product-tags/${crypto.randomUUID()}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'X' }),
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('DELETE /product-tags/:id', () => {
    it('should delete the tag and return null data', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await authPost(app, '/product-tags', token, VALID_TAG)
      const { data: created } = await createRes.json()

      const res = await authDelete(app, `/product-tags/${created.id}`, token)

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toBeNull()
    })

    it('should make the tag unreachable after deletion', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await authPost(app, '/product-tags', token, VALID_TAG)
      const { data: created } = await createRes.json()

      await authDelete(app, `/product-tags/${created.id}`, token)

      const res = await app.request(`/product-tags/${created.id}`)
      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })

    it('should not affect other tags when deleting one', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const r1 = await authPost(app, '/product-tags', token, VALID_TAG)
      const r2 = await authPost(app, '/product-tags', token, { name: 'Hydratation' })

      const { data: t1 } = await r1.json()
      const { data: t2 } = await r2.json()

      await authDelete(app, `/product-tags/${t1.id}`, token)

      const res = await app.request(`/product-tags/${t2.id}`)
      expect(res.status).toBe(HTTP_STATUS.OK)
    })

    it('should return 404 for unknown id', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authDelete(app, `/product-tags/${crypto.randomUUID()}`, token)

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
      const data = await res.json()
      expect(data.error).toBe('tag_not_found')
    })

    it('should reject unauthenticated request', async () => {
      const res = await app.request(`/product-tags/${crypto.randomUUID()}`, { method: 'DELETE' })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })
})
