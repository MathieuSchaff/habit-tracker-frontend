import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { createIngredient } from '../../../features/ingredients/service'
import { testDb } from '../../../tests/db.test.config'
import { createTestApp } from '../../../tests/helpers/createTestApp'
import {
  authDelete,
  authPatch,
  authPost,
  setupAndLogin,
} from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { addTagToIngredient } from '../service'

const VALID_TAG = { name: 'Hydratant' }

describe('Ingredient Tag Routes', () => {
  let app: Hono<AppEnv>

  beforeEach(async () => {
    app = await createTestApp()
  })

  describe('POST /ingredient-tags', () => {
    it('should create a tag with only a name', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPost(app, '/ingredient-tags', token, VALID_TAG)

      expect(res.status).toBe(HTTP_STATUS.CREATED)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.id).toBeDefined()
      expect(data.data.label).toBe('Hydratant')
      expect(data.data.slug).toBe('hydratant')
      expect(data.data.tagType).toBe('')
    })

    it('should create a tag with a category', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPost(app, '/ingredient-tags', token, {
        name: 'Apaisant',
        category: 'effect',
      })

      expect(res.status).toBe(HTTP_STATUS.CREATED)
      const data = await res.json()
      expect(data.data.label).toBe('Apaisant')
      expect(data.data.tagType).toBe('effect')
    })

    it('should auto-generate slug from name', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPost(app, '/ingredient-tags', token, { name: 'Acide Salicylique' })
      const data = await res.json()

      expect(data.data.slug).toBe('acide-salicylique')
    })

    it('should use custom slug when provided', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPost(app, '/ingredient-tags', token, {
        name: 'Niacinamide',
        slug: 'niacinamide-custom',
      })
      const data = await res.json()

      expect(data.data.slug).toBe('niacinamide-custom')
    })

    it('should return 409 for duplicate slug', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      await authPost(app, '/ingredient-tags', token, { name: 'Acide', slug: 'acide' })
      const res = await authPost(app, '/ingredient-tags', token, {
        name: 'Acide Bis',
        slug: 'acide',
      })

      expect(res.status).toBe(HTTP_STATUS.CONFLICT)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('tag_already_exists')
    })

    it('should reject missing name', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPost(app, '/ingredient-tags', token, { category: 'effect' })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject unauthenticated request', async () => {
      const res = await app.request('/ingredient-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_TAG),
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('GET /ingredient-tags', () => {
    it('should list tags without auth', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      await authPost(app, '/ingredient-tags', token, { name: 'Tag 1' })
      await authPost(app, '/ingredient-tags', token, { name: 'Tag 2' })

      const res = await app.request('/ingredient-tags')

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.length).toBeGreaterThanOrEqual(2)
    })

    it('should filter by category', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      await authPost(app, '/ingredient-tags', token, { name: 'Hydratant', category: 'effect' })
      await authPost(app, '/ingredient-tags', token, { name: 'Acide', category: 'type' })

      const res = await app.request('/ingredient-tags?category=effect')

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.data.every((t: { tagType: string }) => t.tagType === 'effect')).toBe(true)
    })
  })

  describe('GET /ingredient-tags/:id', () => {
    it('should return the tag without auth', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await authPost(app, '/ingredient-tags', token, VALID_TAG)
      const { data: created } = await createRes.json()

      const res = await app.request(`/ingredient-tags/${created.id}`)

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.data.id).toBe(created.id)
      expect(data.data.label).toBe('Hydratant')
    })

    it('should return 404 for unknown id', async () => {
      const res = await app.request(`/ingredient-tags/${crypto.randomUUID()}`)

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
      const data = await res.json()
      expect(data.error).toBe('tag_not_found')
    })

    it('should return 400 for an invalid UUID', async () => {
      const res = await app.request('/ingredient-tags/not-a-uuid')

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })
  })

  describe('PATCH /ingredient-tags/:id', () => {
    it('should update tag fields', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await authPost(app, '/ingredient-tags', token, { name: 'Vieux' })
      const { data: created } = await createRes.json()

      const res = await authPatch(app, `/ingredient-tags/${created.id}`, token, {
        name: 'Neuf',
        category: 'type',
      })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.data.label).toBe('Neuf')
      expect(data.data.tagType).toBe('type')
    })

    it('should return 404 for unknown id', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPatch(app, `/ingredient-tags/${crypto.randomUUID()}`, token, {
        name: 'X',
      })

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
      const data = await res.json()
      expect(data.error).toBe('tag_not_found')
    })

    it('should return 409 when updating to a conflicting slug', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      await authPost(app, '/ingredient-tags', token, { name: 'Premier', slug: 'premier' })
      const r2 = await authPost(app, '/ingredient-tags', token, { name: 'Deuxième' })
      const { data: t2 } = await r2.json()

      const res = await authPatch(app, `/ingredient-tags/${t2.id}`, token, {
        name: 'Premier',
        slug: 'premier',
      })

      expect(res.status).toBe(HTTP_STATUS.CONFLICT)
      const data = await res.json()
      expect(data.error).toBe('tag_already_exists')
    })

    it('should reject unauthenticated request', async () => {
      const res = await app.request(`/ingredient-tags/${crypto.randomUUID()}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'X' }),
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('DELETE /ingredient-tags/:id', () => {
    it('should delete the tag and return null data', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await authPost(app, '/ingredient-tags', token, VALID_TAG)
      const { data: created } = await createRes.json()

      const res = await authDelete(app, `/ingredient-tags/${created.id}`, token)

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.data).toBeNull()
    })

    it('should make the tag unreachable after deletion', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await authPost(app, '/ingredient-tags', token, VALID_TAG)
      const { data: created } = await createRes.json()

      await authDelete(app, `/ingredient-tags/${created.id}`, token)

      const res = await app.request(`/ingredient-tags/${created.id}`)
      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })

    it('should return 404 for unknown id', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authDelete(app, `/ingredient-tags/${crypto.randomUUID()}`, token)

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })

    it('should reject unauthenticated request', async () => {
      const res = await app.request(`/ingredient-tags/${crypto.randomUUID()}`, { method: 'DELETE' })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('GET /ingredient-tags/:slug/ingredients', () => {
    it('should return ingredients linked to a tag', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const ingOwner = await createTestUser('inger-tag-owner@test.com')

      const tagRes = await authPost(app, '/ingredient-tags', token, { name: 'Apaisant' })
      const { data: tag } = await tagRes.json()

      const ing = await createIngredient(testDb, ingOwner.id, {
        name: 'Centella',
        type: 'skincare',
      })
      await addTagToIngredient(testDb, ing.id, tag.id)

      const res = await app.request(`/ingredient-tags/${tag.slug}/ingredients`)

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0]?.name).toBe('Centella')
    })

    it('should return 404 for unknown slug', async () => {
      const res = await app.request('/ingredient-tags/slug-inexistant/ingredients')

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
      const data = await res.json()
      expect(data.error).toBe('tag_not_found')
    })
  })
})
