import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import { createIngredient } from '../../../features/ingredients/service'
import { testDb } from '../../../tests/db.test.config'
import { setupDbTests } from '../../../tests/db-setup'
import { createTestEnv, type TestClient, withAuth } from '../../../tests/helpers/createTestClient'
import { expectStatus } from '../../../tests/helpers/expectStatus'
import {
  setupAndLogin,
  setupAndLoginAdmin,
  setupAndLoginContributor,
} from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { addTagToIngredient } from '../service'

type ApiErrorBody = { success: false; error: string }

const VALID_TAG = { name: 'Hydratant' }

setupDbTests()

describe('Ingredient Tag Routes', () => {
  let app: Awaited<ReturnType<typeof createTestEnv>>['app']
  let client: TestClient

  beforeEach(async () => {
    ;({ app, client } = await createTestEnv())
  })

  describe('POST /ingredient-tags', () => {
    it('should create a tag with only a name', async () => {
      const token = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)

      const res = await client['ingredient-tags'].$post({ json: VALID_TAG }, withAuth(token))

      expectStatus(res, HTTP_STATUS.CREATED)
      const data = await res.json()
      if (!data.success) throw new Error('create tag failed')
      expect(data.data.id).toBeDefined()
      expect(data.data.label).toBe('Hydratant')
      expect(data.data.slug).toBe('hydratant')
      expect(data.data.tagType).toBe('')
    })

    it('should create a tag with a category', async () => {
      const token = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)

      const res = await client['ingredient-tags'].$post(
        { json: { name: 'Apaisant', category: 'effect' } },
        withAuth(token)
      )

      expectStatus(res, HTTP_STATUS.CREATED)
      const data = await res.json()
      if (!data.success) throw new Error('create tag failed')
      expect(data.data.label).toBe('Apaisant')
      expect(data.data.tagType).toBe('effect')
    })

    it('should auto-generate slug from name', async () => {
      const token = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)

      const res = await client['ingredient-tags'].$post(
        { json: { name: 'Acide Salicylique' } },
        withAuth(token)
      )
      const data = await res.json()
      if (!data.success) throw new Error('create tag failed')

      expect(data.data.slug).toBe('acide-salicylique')
    })

    it('should use custom slug when provided', async () => {
      const token = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)

      const res = await client['ingredient-tags'].$post(
        { json: { name: 'Niacinamide', slug: 'niacinamide-custom' } },
        withAuth(token)
      )
      const data = await res.json()
      if (!data.success) throw new Error('create tag failed')

      expect(data.data.slug).toBe('niacinamide-custom')
    })

    it('should return 409 for duplicate slug', async () => {
      const token = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)

      await client['ingredient-tags'].$post(
        { json: { name: 'Acide', slug: 'acide' } },
        withAuth(token)
      )
      const res = await client['ingredient-tags'].$post(
        { json: { name: 'Acide Bis', slug: 'acide' } },
        withAuth(token)
      )

      expectStatus(res, HTTP_STATUS.CONFLICT)
      // Errors thrown by route handlers bypass the typed response — read raw.
      const body = (await res.json()) as unknown as ApiErrorBody
      expect(body.success).toBe(false)
      expect(body.error).toBe('tag_already_exists')
    })

    it('should reject missing name', async () => {
      const token = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)

      const res = await client['ingredient-tags'].$post(
        // @ts-expect-error — missing required name; testing schema rejection
        { json: { category: 'effect' } },
        withAuth(token)
      )

      expectStatus(res, HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject unauthenticated request', async () => {
      const res = await app.request('/ingredient-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_TAG),
      })

      expectStatus(res, HTTP_STATUS.UNAUTHORIZED)
    })

    describe('role enforcement', () => {
      it('403 for a plain user', async () => {
        const userToken = await setupAndLogin(app, TEST_CREDENTIALS.toto)
        const res = await client['ingredient-tags'].$post(
          { json: { name: 'X', category: 'effect' } },
          withAuth(userToken)
        )
        expectStatus(res, HTTP_STATUS.FORBIDDEN)
      })

      it('403 for a contributor', async () => {
        const contribToken = await setupAndLoginContributor(app, TEST_CREDENTIALS.contributor)
        const res = await client['ingredient-tags'].$post(
          { json: { name: 'X', category: 'effect' } },
          withAuth(contribToken)
        )
        expectStatus(res, HTTP_STATUS.FORBIDDEN)
      })

      it('201 for an admin', async () => {
        const adminToken = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)
        const res = await client['ingredient-tags'].$post(
          { json: { name: 'X', category: 'effect' } },
          withAuth(adminToken)
        )
        expectStatus(res, HTTP_STATUS.CREATED)
      })
    })
  })

  describe('GET /ingredient-tags', () => {
    it('should list tags without auth', async () => {
      const token = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)

      await client['ingredient-tags'].$post({ json: { name: 'Tag 1' } }, withAuth(token))
      await client['ingredient-tags'].$post({ json: { name: 'Tag 2' } }, withAuth(token))

      const res = await client['ingredient-tags'].$get({ query: {} })

      expectStatus(res, HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('list tags failed')
      expect(data.data.length).toBeGreaterThanOrEqual(2)
    })

    it('should filter by category', async () => {
      const token = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)

      await client['ingredient-tags'].$post(
        { json: { name: 'Hydratant', category: 'effect' } },
        withAuth(token)
      )
      await client['ingredient-tags'].$post(
        { json: { name: 'Acide', category: 'type' } },
        withAuth(token)
      )

      const res = await client['ingredient-tags'].$get({ query: { category: 'effect' } })

      expectStatus(res, HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('list tags failed')
      expect(data.data.every((t) => t.tagType === 'effect')).toBe(true)
    })
  })

  describe('GET /ingredient-tags/:id', () => {
    it('should return the tag without auth', async () => {
      const token = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)

      const createRes = await client['ingredient-tags'].$post({ json: VALID_TAG }, withAuth(token))
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create tag failed')
      const created = createData.data

      const res = await client['ingredient-tags'][':id'].$get({ param: { id: created.id } })

      expectStatus(res, HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('get tag failed')
      expect(data.data.id).toBe(created.id)
      expect(data.data.label).toBe('Hydratant')
    })

    it('should return 404 for unknown id', async () => {
      const res = await client['ingredient-tags'][':id'].$get({
        param: { id: crypto.randomUUID() },
      })

      expectStatus(res, HTTP_STATUS.NOT_FOUND)
      const body = (await res.json()) as unknown as ApiErrorBody
      expect(body.error).toBe('tag_not_found')
    })

    it('should return 400 for an invalid UUID', async () => {
      const res = await client['ingredient-tags'][':id'].$get({ param: { id: 'not-a-uuid' } })

      expectStatus(res, HTTP_STATUS.BAD_REQUEST)
    })
  })

  describe('PATCH /ingredient-tags/:id', () => {
    it('should update tag fields', async () => {
      const token = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)

      const createRes = await client['ingredient-tags'].$post(
        { json: { name: 'Vieux' } },
        withAuth(token)
      )
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create tag failed')
      const created = createData.data

      const res = await client['ingredient-tags'][':id'].$patch(
        { param: { id: created.id }, json: { name: 'Neuf', category: 'type' } },
        withAuth(token)
      )

      expectStatus(res, HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('update tag failed')
      expect(data.data.label).toBe('Neuf')
      expect(data.data.tagType).toBe('type')
    })

    it('should return 404 for unknown id', async () => {
      const token = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)

      const res = await client['ingredient-tags'][':id'].$patch(
        { param: { id: crypto.randomUUID() }, json: { name: 'X' } },
        withAuth(token)
      )

      expectStatus(res, HTTP_STATUS.NOT_FOUND)
      const body = (await res.json()) as unknown as ApiErrorBody
      expect(body.error).toBe('tag_not_found')
    })

    it('should return 409 when updating to a conflicting slug', async () => {
      const token = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)

      await client['ingredient-tags'].$post(
        { json: { name: 'Premier', slug: 'premier' } },
        withAuth(token)
      )
      const r2 = await client['ingredient-tags'].$post(
        { json: { name: 'Deuxième' } },
        withAuth(token)
      )
      const r2Data = await r2.json()
      if (!r2Data.success) throw new Error('create tag failed')
      const t2 = r2Data.data

      const res = await client['ingredient-tags'][':id'].$patch(
        { param: { id: t2.id }, json: { name: 'Premier', slug: 'premier' } },
        withAuth(token)
      )

      expectStatus(res, HTTP_STATUS.CONFLICT)
      const body = (await res.json()) as unknown as ApiErrorBody
      expect(body.error).toBe('tag_already_exists')
    })

    it('should reject unauthenticated request', async () => {
      const res = await app.request(`/ingredient-tags/${crypto.randomUUID()}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'X' }),
      })

      expectStatus(res, HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('DELETE /ingredient-tags/:id', () => {
    it('should delete the tag and return null data', async () => {
      const token = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)

      const createRes = await client['ingredient-tags'].$post({ json: VALID_TAG }, withAuth(token))
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create tag failed')
      const created = createData.data

      const res = await client['ingredient-tags'][':id'].$delete(
        { param: { id: created.id } },
        withAuth(token)
      )

      expectStatus(res, HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.data).toBeNull()
    })

    it('should make the tag unreachable after deletion', async () => {
      const token = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)

      const createRes = await client['ingredient-tags'].$post({ json: VALID_TAG }, withAuth(token))
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create tag failed')
      const created = createData.data

      await client['ingredient-tags'][':id'].$delete({ param: { id: created.id } }, withAuth(token))

      const res = await client['ingredient-tags'][':id'].$get({ param: { id: created.id } })
      expectStatus(res, HTTP_STATUS.NOT_FOUND)
    })

    it('should return 404 for unknown id', async () => {
      const token = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)

      const res = await client['ingredient-tags'][':id'].$delete(
        { param: { id: crypto.randomUUID() } },
        withAuth(token)
      )

      expectStatus(res, HTTP_STATUS.NOT_FOUND)
    })

    it('should reject unauthenticated request', async () => {
      const res = await app.request(`/ingredient-tags/${crypto.randomUUID()}`, { method: 'DELETE' })

      expectStatus(res, HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('GET /ingredient-tags/:slug/ingredients', () => {
    it('should return ingredients linked to a tag', async () => {
      const token = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)
      const ingOwner = await createTestUser('inger-tag-owner@test.com')

      const tagRes = await client['ingredient-tags'].$post(
        { json: { name: 'Apaisant' } },
        withAuth(token)
      )
      const tagData = await tagRes.json()
      if (!tagData.success) throw new Error('create tag failed')
      const tag = tagData.data

      const ing = await createIngredient(testDb, ingOwner.id, {
        name: 'Centella',
        type: 'skincare',
      })
      await addTagToIngredient(testDb, ing.id, tag.id)

      const res = await client['ingredient-tags'][':slug'].ingredients.$get({
        param: { slug: tag.slug },
      })

      expectStatus(res, HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('list ingredients failed')
      expect(data.data).toHaveLength(1)
      expect(data.data[0]?.name).toBe('Centella')
    })

    it('should return 404 for unknown slug', async () => {
      const res = await client['ingredient-tags'][':slug'].ingredients.$get({
        param: { slug: 'slug-inexistant' },
      })

      expectStatus(res, HTTP_STATUS.NOT_FOUND)
      const body = (await res.json()) as unknown as ApiErrorBody
      expect(body.error).toBe('tag_not_found')
    })
  })
})
