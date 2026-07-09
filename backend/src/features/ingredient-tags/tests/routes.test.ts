import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@aurore/shared'

import { createIngredient } from '../../../features/ingredients/service'
import { testDb } from '../../../tests/db.test.config'
import { setupDbTests } from '../../../tests/db-setup'
import { expectRequiresAuth, expectRoleMatrix } from '../../../tests/helpers/authz-matrix'
import { createTestEnv, type TestClient, withAuth } from '../../../tests/helpers/createTestClient'
import { expectStatus } from '../../../tests/helpers/expectStatus'
import { setupAndLoginAdmin } from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { addTagToIngredient } from '../service'

type ApiErrorBody = { success: false; error: string }

const VALID_TAG = { label: 'Hydratant' }

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
        { json: { label: 'Apaisant', tagType: 'effect' } },
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
        { json: { label: 'Acide Salicylique' } },
        withAuth(token)
      )
      const data = await res.json()
      if (!data.success) throw new Error('create tag failed')

      expect(data.data.slug).toBe('acide-salicylique')
    })

    it('should use custom slug when provided', async () => {
      const token = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)

      const res = await client['ingredient-tags'].$post(
        { json: { label: 'Niacinamide', slug: 'niacinamide-custom' } },
        withAuth(token)
      )
      const data = await res.json()
      if (!data.success) throw new Error('create tag failed')

      expect(data.data.slug).toBe('niacinamide-custom')
    })

    it('should return 409 for duplicate slug', async () => {
      const token = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)

      await client['ingredient-tags'].$post(
        { json: { label: 'Acide', slug: 'acide' } },
        withAuth(token)
      )
      const res = await client['ingredient-tags'].$post(
        { json: { label: 'Acide Bis', slug: 'acide' } },
        withAuth(token)
      )

      expectStatus(res, HTTP_STATUS.CONFLICT)
      // Errors thrown by route handlers bypass the typed response, read raw.
      const body = (await res.json()) as unknown as ApiErrorBody
      expect(body.success).toBe(false)
      expect(body.error).toBe('tag_already_exists')
    })

    it('should reject missing label', async () => {
      const token = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)

      const res = await client['ingredient-tags'].$post(
        // @ts-expect-error missing required label, testing schema rejection
        { json: { tagType: 'effect' } },
        withAuth(token)
      )

      expectStatus(res, HTTP_STATUS.BAD_REQUEST)
    })

    expectRequiresAuth(() => app, { method: 'POST', path: '/api/ingredient-tags', body: VALID_TAG })

    describe('role enforcement', () => {
      expectRoleMatrix(
        () => app,
        { method: 'POST', path: '/api/ingredient-tags', body: { label: 'X', tagType: 'effect' } },
        {
          user: HTTP_STATUS.FORBIDDEN,
          contributor: HTTP_STATUS.FORBIDDEN,
          admin: HTTP_STATUS.CREATED,
        }
      )
    })
  })

  describe('GET /ingredient-tags', () => {
    it('should list tags without auth', async () => {
      const token = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)

      await client['ingredient-tags'].$post({ json: { label: 'Tag 1' } }, withAuth(token))
      await client['ingredient-tags'].$post({ json: { label: 'Tag 2' } }, withAuth(token))

      const res = await client['ingredient-tags'].$get({ query: {} })

      expectStatus(res, HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('list tags failed')
      expect(data.data.length).toBeGreaterThanOrEqual(2)
    })

    it('should filter by category', async () => {
      const token = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)

      await client['ingredient-tags'].$post(
        { json: { label: 'Hydratant', tagType: 'effect' } },
        withAuth(token)
      )
      await client['ingredient-tags'].$post(
        { json: { label: 'Acide', tagType: 'type' } },
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
        { json: { label: 'Vieux' } },
        withAuth(token)
      )
      const createData = await createRes.json()
      if (!createData.success) throw new Error('create tag failed')
      const created = createData.data

      const res = await client['ingredient-tags'][':id'].$patch(
        { param: { id: created.id }, json: { label: 'Neuf', tagType: 'type' } },
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
        { param: { id: crypto.randomUUID() }, json: { label: 'X' } },
        withAuth(token)
      )

      expectStatus(res, HTTP_STATUS.NOT_FOUND)
      const body = (await res.json()) as unknown as ApiErrorBody
      expect(body.error).toBe('tag_not_found')
    })

    it('should return 409 when updating to a conflicting slug', async () => {
      const token = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)

      await client['ingredient-tags'].$post(
        { json: { label: 'Premier', slug: 'premier' } },
        withAuth(token)
      )
      const secondRes = await client['ingredient-tags'].$post(
        { json: { label: 'Deuxième' } },
        withAuth(token)
      )
      const secondData = await secondRes.json()
      if (!secondData.success) throw new Error('create tag failed')
      const secondTag = secondData.data

      const res = await client['ingredient-tags'][':id'].$patch(
        { param: { id: secondTag.id }, json: { label: 'Premier', slug: 'premier' } },
        withAuth(token)
      )

      expectStatus(res, HTTP_STATUS.CONFLICT)
      const body = (await res.json()) as unknown as ApiErrorBody
      expect(body.error).toBe('tag_already_exists')
    })

    expectRequiresAuth(() => app, {
      method: 'PATCH',
      path: `/api/ingredient-tags/${crypto.randomUUID()}`,
      body: { name: 'X' },
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
      if (!data.success) throw new Error('delete tag failed')
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

    expectRequiresAuth(() => app, {
      method: 'DELETE',
      path: `/api/ingredient-tags/${crypto.randomUUID()}`,
    })
  })

  describe('GET /ingredient-tags/:slug/ingredients', () => {
    it('should return ingredients linked to a tag', async () => {
      const token = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)
      const ingOwner = await createTestUser('inger-tag-owner@test.com')

      const tagRes = await client['ingredient-tags'].$post(
        { json: { label: 'Apaisant' } },
        withAuth(token)
      )
      const tagData = await tagRes.json()
      if (!tagData.success) throw new Error('create tag failed')
      const tag = tagData.data

      const ing = await createIngredient(testDb, ingOwner.id, 'contributor', {
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
