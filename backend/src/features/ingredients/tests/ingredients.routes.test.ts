import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import { eq } from 'drizzle-orm'
import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { users } from '../../../db/schema'
import { testDb } from '../../../tests/db.test.config'
import { createTestApp } from '../../../tests/helpers/createTestApp'
import {
  authDelete,
  authPatch,
  authPost,
  setupAndLogin,
} from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'

const VALID_INGREDIENT = { name: 'Rétinol', type: 'skincare' }

describe('Ingredient Routes', () => {
  let app: Hono<AppEnv>

  beforeEach(async () => {
    app = await createTestApp()
  })

  describe('POST /ingredients', () => {
    it('should create an ingredient with only a name', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPost(app, '/ingredients', token, VALID_INGREDIENT)

      expect(res.status).toBe(HTTP_STATUS.CREATED)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.id).toBeDefined()
      expect(data.data.name).toBe('Rétinol')
      expect(data.data.slug).toBe('retinol')
      expect(data.data.description).toBe('')
      expect(data.data.content).toBe('')
      expect(data.data.category).toBeNull()
    })

    it('should create an ingredient with all optional fields', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPost(app, '/ingredients', token, {
        name: 'Acide Ascorbique',
        type: 'skincare',
        description: 'Forme pure de la vitamine C',
        content: '## Description\n\nActif antioxydant.',
        category: 'vitamine',
      })

      expect(res.status).toBe(HTTP_STATUS.CREATED)
      const data = await res.json()
      expect(data.data.description).toBe('Forme pure de la vitamine C')
      expect(data.data.content).toBe('## Description\n\nActif antioxydant.')
      expect(data.data.category).toBe('vitamine')
    })

    it('should auto-generate slug from name', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPost(app, '/ingredients', token, { name: 'Acide Hyaluronique', type: 'skincare' })
      const data = await res.json()

      expect(data.data.slug).toBe('acide-hyaluronique')
    })

    it('should use custom slug when provided by admin', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const profileRes = await app.request('/profile', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const { data: profile } = await profileRes.json()
      await testDb.update(users).set({ role: 'admin' }).where(eq(users.id, profile.userId))

      const res = await authPost(app, '/ingredients', token, {
        name: 'Niacinamide',
        type: 'skincare',
        slug: 'niacin',
      })
      const data = await res.json()

      expect(data.data.slug).toBe('niacin')
    })

    it('should NOT use custom slug when provided by non-admin', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPost(app, '/ingredients', token, {
        name: 'Niacinamide',
        type: 'skincare',
        slug: 'niacin',
      })
      const data = await res.json()

      expect(data.data.slug).toBe('niacinamide') // auto-generated
    })

    it('should return 409 for duplicate slug (admin)', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const profileRes = await app.request('/profile', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const { data: profile } = await profileRes.json()
      await testDb.update(users).set({ role: 'admin' }).where(eq(users.id, profile.userId))

      await authPost(app, '/ingredients', token, { name: 'Magnésium', type: 'skincare', slug: 'magnesium' })
      const res = await authPost(app, '/ingredients', token, {
        name: 'Magnésium Bis',
        type: 'skincare',
        slug: 'magnesium',
      })

      expect(res.status).toBe(HTTP_STATUS.CONFLICT)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('ingredient_already_exists')
    })

    it('should reject missing name', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const res = await authPost(app, '/ingredients', token, { description: 'orphan' })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject unauthenticated request', async () => {
      const res = await app.request('/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_INGREDIENT),
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should reject request with invalid token', async () => {
      const res = await authPost(app, '/ingredients', 'invalid.token.here', VALID_INGREDIENT)

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should reject invalid slug formats and malicious strings', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const badSlugs = [
        'UPPERCASE',
        'with spaces',
        'multiple--hyphens',
        'trailing-hyphen-',
        '-leading-hyphen',
        'dot.in.slug',
        'under_score',

        'hello@world',
        'price$100',
        'tag#navigation',
        'search?q=test',
        'percent%20encoded',
        'back\\slash',
        'forward/slash',
        'pipe|line',
        'star*asterisk',

        '<script>alert(1)</script>',
        'javascript:alert(1)',
        '<img src=x onerror=alert(1)>',
        '"><script>confirm(1)</script>',

        "' OR '1'='1",
        "'; DROP TABLE ingredients; --",
        '1; SELECT * FROM users',
        'admin --',

        '../../etc/passwd',
        'C:\\Windows\\System32',
        '/root',
        '~/.ssh/id_rsa',

        'a'.repeat(101),
      ]

      for (const slug of badSlugs) {
        const res = await authPost(app, '/ingredients', token, {
          name: 'Security Test',
          slug,
        })
        expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
      }
    })
  })

  describe('GET /ingredients/:slug', () => {
    it('should return the ingredient by slug without auth', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await authPost(app, '/ingredients', token, VALID_INGREDIENT)
      const { data: created } = await createRes.json()

      const res = await app.request(`/ingredients/${created.slug}`)

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.id).toBe(created.id)
      expect(data.data.slug).toBe(created.slug)
      expect(data.data.name).toBe('Rétinol')
    })

    it('should also work when authenticated', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await authPost(app, '/ingredients', token, VALID_INGREDIENT)
      const { data: created } = await createRes.json()

      const res = await app.request(`/ingredients/${created.slug}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.data.id).toBe(created.id)
    })

    it('should return 404 for unknown slug', async () => {
      const res = await app.request('/ingredients/slug-inexistant')

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('ingredient_not_found')
    })
  })

  describe('PATCH /ingredients/:id', () => {
    it('should update ingredient fields', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await authPost(app, '/ingredients', token, VALID_INGREDIENT)
      const { data: created } = await createRes.json()

      const res = await authPatch(app, `/ingredients/${created.id}`, token, {
        description: 'Alternative naturelle au rétinol',
        category: 'actif',
      })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.description).toBe('Alternative naturelle au rétinol')
      expect(data.data.category).toBe('actif')
      expect(data.data.name).toBe('Rétinol')
    })

    it('should not affect untouched fields', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await authPost(app, '/ingredients', token, {
        ...VALID_INGREDIENT,
        content: 'Contenu initial',
      })
      const { data: created } = await createRes.json()

      await authPatch(app, `/ingredients/${created.id}`, token, { category: 'actif' })

      const res = await app.request(`/ingredients/${created.slug}`)
      const data = await res.json()
      expect(data.data.content).toBe('Contenu initial')
    })

    it('should persist updates across requests', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await authPost(app, '/ingredients', token, VALID_INGREDIENT)
      const { data: created } = await createRes.json()

      await authPatch(app, `/ingredients/${created.id}`, token, {
        description: 'Description persistée',
      })

      const res = await app.request(`/ingredients/${created.slug}`)
      const data = await res.json()
      expect(data.data.description).toBe('Description persistée')
    })

    it('should auto-update slug when name changes', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await authPost(app, '/ingredients', token, { name: 'Vitamine E', type: 'skincare' })
      const { data: created } = await createRes.json()

      const res = await authPatch(app, `/ingredients/${created.id}`, token, {
        name: 'Vitamine E Tocopherol',
      })
      const data = await res.json()
      expect(data.data.slug).toBe('vitamine-e-tocopherol')
    })

    it('should return 404 for unknown id', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const fakeId = crypto.randomUUID()

      const res = await authPatch(app, `/ingredients/${fakeId}`, token, { description: 'X' })

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
      const data = await res.json()
      expect(data.error).toBe('ingredient_not_found')
    })

    it('should reject unknown fields (strict schema)', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await authPost(app, '/ingredients', token, VALID_INGREDIENT)
      const { data: created } = await createRes.json()

      const res = await authPatch(app, `/ingredients/${created.id}`, token, {
        hackerField: 'oops',
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject unauthenticated request', async () => {
      const fakeId = crypto.randomUUID()
      const res = await app.request(`/ingredients/${fakeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'X' }),
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('DELETE /ingredients/:id', () => {
    it('should delete the ingredient and return null data', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await authPost(app, '/ingredients', token, VALID_INGREDIENT)
      const { data: created } = await createRes.json()

      const res = await authDelete(app, `/ingredients/${created.id}`, token)

      expect(res.status).toBe(204)
    })

    it('should make the ingredient unreachable by slug after deletion', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await authPost(app, '/ingredients', token, VALID_INGREDIENT)
      const { data: created } = await createRes.json()

      await authDelete(app, `/ingredients/${created.id}`, token)

      const res = await app.request(`/ingredients/${created.slug}`)
      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })

    it('should not affect other ingredients when deleting one', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const r1 = await authPost(app, '/ingredients', token, VALID_INGREDIENT)
      const r2 = await authPost(app, '/ingredients', token, { name: 'Niacinamide', type: 'skincare' })

      const { data: i1 } = await r1.json()
      const { data: i2 } = await r2.json()

      await authDelete(app, `/ingredients/${i1.id}`, token)

      const res = await app.request(`/ingredients/${i2.slug}`)
      expect(res.status).toBe(HTTP_STATUS.OK)
    })

    it('should return 500 for unknown id (ingredient_delete_failed)', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const fakeId = crypto.randomUUID()

      const res = await authDelete(app, `/ingredients/${fakeId}`, token)

      expect(res.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      const data = await res.json()
      expect(data.error).toBe('ingredient_delete_failed')
    })

    it('should reject unauthenticated request', async () => {
      const fakeId = crypto.randomUUID()
      const res = await app.request(`/ingredients/${fakeId}`, { method: 'DELETE' })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('GET /ingredients/:slug/edits', () => {
    it('should return an empty list for a new ingredient', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await authPost(app, '/ingredients', token, VALID_INGREDIENT)
      const { data: created } = await createRes.json()

      const res = await app.request(`/ingredients/${created.slug}/edits`)

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toEqual([])
    })

    it('should return edits after an update without auth', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await authPost(app, '/ingredients', token, VALID_INGREDIENT)
      const { data: created } = await createRes.json()

      await authPatch(app, `/ingredients/${created.id}`, token, {
        description: 'Première description',
      })

      const res = await app.request(`/ingredients/${created.slug}/edits`)

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].ingredientId).toBe(created.id)
      expect(data.data[0].changes).toHaveProperty('description')
    })

    it('should return edits newest first', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await authPost(app, '/ingredients', token, VALID_INGREDIENT)
      const { data: created } = await createRes.json()

      await authPatch(app, `/ingredients/${created.id}`, token, {
        description: 'Première description',
      })
      await authPatch(app, `/ingredients/${created.id}`, token, {
        content: 'Deuxième modification',
      })

      const res = await app.request(`/ingredients/${created.slug}/edits`)
      const data = await res.json()

      expect(data.data).toHaveLength(2)
      expect(data.data[0].changes).toHaveProperty('content')
      expect(data.data[1].changes).toHaveProperty('description')
    })

    it('should return 404 for unknown slug', async () => {
      const res = await app.request('/ingredients/slug-inexistant/edits')

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND)
    })

    it('should not return edits from other ingredients', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const r1 = await authPost(app, '/ingredients', token, VALID_INGREDIENT)
      const r2 = await authPost(app, '/ingredients', token, { name: 'Niacinamide', type: 'skincare' })

      const { data: i1 } = await r1.json()
      const { data: i2 } = await r2.json()

      await authPatch(app, `/ingredients/${i1.id}`, token, { description: 'Edit sur i1' })

      const res = await app.request(`/ingredients/${i2.slug}/edits`)
      const data = await res.json()
      expect(data.data).toHaveLength(0)
    })

    it('should record old and new values in changes', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await authPost(app, '/ingredients', token, {
        name: 'Rétinol',
        type: 'skincare',
        description: 'Ancienne description',
      })
      const { data: created } = await createRes.json()

      await authPatch(app, `/ingredients/${created.id}`, token, {
        description: 'Nouvelle description',
      })

      const res = await app.request(`/ingredients/${created.slug}/edits`)
      const data = await res.json()

      const change = data.data[0].changes.description
      expect(change.old).toBe('Ancienne description')
      expect(change.new).toBe('Nouvelle description')
    })

    it('should not create an edit when values are unchanged', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await authPost(app, '/ingredients', token, {
        name: 'Rétinol',
        type: 'skincare',
        description: 'Description inchangée',
      })
      const { data: created } = await createRes.json()

      await authPatch(app, `/ingredients/${created.id}`, token, {
        description: 'Description inchangée',
      })

      const res = await app.request(`/ingredients/${created.slug}/edits`)
      const data = await res.json()
      expect(data.data).toHaveLength(0)
    })

    it('should not track slug in edits when name changes', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const createRes = await authPost(app, '/ingredients', token, { name: 'Vitamine C', type: 'skincare' })
      const { data: created } = await createRes.json()

      const patchRes = await authPatch(app, `/ingredients/${created.id}`, token, {
        name: 'Vitamine C Pure',
      })
      const { data: updated } = await patchRes.json()

      const res = await app.request(`/ingredients/${updated.slug}/edits`)
      const data = await res.json()

      expect(data.data).toHaveLength(1)
      expect(data.data[0].changes).toHaveProperty('name')
      expect(data.data[0].changes).not.toHaveProperty('slug')
    })

    it('should record editedBy with the authenticated user id', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)

      const profileRes = await app.request('/profile', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const { data: profile } = await profileRes.json()

      const createRes = await authPost(app, '/ingredients', token, VALID_INGREDIENT)
      const { data: created } = await createRes.json()

      await authPatch(app, `/ingredients/${created.id}`, token, { description: 'Edit tracée' })

      const res = await app.request(`/ingredients/${created.slug}/edits`)
      const data = await res.json()

      expect(data.data[0].editedBy).toBe(profile.userId)
    })
  })
})
