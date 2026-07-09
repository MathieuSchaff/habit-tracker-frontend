import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@aurore/shared'

import { createIngredientTag } from '../../../features/ingredient-tags/service'
import { testDb } from '../../../tests/db.test.config'
import { setupDbTests } from '../../../tests/db-setup'
import { expectRequiresAuth, expectRoleMatrix } from '../../../tests/helpers/authz-matrix'
import { createTestEnv, type TestClient, withAuth } from '../../../tests/helpers/createTestClient'
import { expectStatus } from '../../../tests/helpers/expectStatus'
import {
  setupAndLoginAdmin,
  setupAndLoginContributor,
} from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'

type IngredientHandle = { id: string; slug: string }
type TestApp = Awaited<ReturnType<typeof createTestEnv>>['app']

async function createIngredient(
  client: TestClient,
  token: string,
  name = 'Rétinol'
): Promise<IngredientHandle> {
  const res = await client.ingredients.$post({ json: { name, type: 'skincare' } }, withAuth(token))
  const data = await res.json()
  if (!data.success) throw new Error('create ingredient failed')
  return { id: data.data.id, slug: data.data.slug }
}

async function createTag(_client: TestClient, _token: string, name = 'Anti-âge') {
  // Ingredient↔tag links FK to `ingredient_tags`, not `product_tags_defs`.
  // Insert directly via service since the HTTP route requires admin and tests
  // need the tag as a fixture, not to assert creation behaviour.
  const tag = await createIngredientTag(testDb, { label: name })
  return { id: tag.id, slug: tag.slug }
}

setupDbTests()

describe('Ingredient Tag Routes', () => {
  let app: TestApp
  let client: TestClient
  // Ingredient fixtures now require contributor+ (catalog-authz); the
  // ingredient↔tag link routes under test remain admin-only.
  let contributorToken: string

  beforeEach(async () => {
    ;({ app, client } = await createTestEnv())
    contributorToken = await setupAndLoginContributor(app, TEST_CREDENTIALS.contributor)
  })

  describe('GET /ingredients/:ingredientId/tags', () => {
    it('should return empty list when no tags linked', async () => {
      const ingredient = await createIngredient(client, contributorToken)

      const res = await client.ingredients[':ingredientId'].tags.$get({
        param: { ingredientId: ingredient.id },
      })

      expectStatus(res, HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('list tags failed')
      expect(data.data).toEqual([])
    })

    it('should return tags after adding one', async () => {
      const adminToken = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)
      const ingredient = await createIngredient(client, contributorToken)
      const tag = await createTag(client, adminToken)

      await client.ingredients[':ingredientId'].tags.$post(
        { param: { ingredientId: ingredient.id }, json: { tagId: tag.id } },
        withAuth(adminToken)
      )

      const res = await client.ingredients[':ingredientId'].tags.$get({
        param: { ingredientId: ingredient.id },
      })
      expectStatus(res, HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('list tags failed')
      expect(data.data).toHaveLength(1)
    })

    it('should not require authentication', async () => {
      const ingredient = await createIngredient(client, contributorToken)

      const res = await client.ingredients[':ingredientId'].tags.$get({
        param: { ingredientId: ingredient.id },
      })
      expectStatus(res, HTTP_STATUS.OK)
    })

    it('should reject invalid ingredientId (non-UUID)', async () => {
      const res = await client.ingredients[':ingredientId'].tags.$get({
        param: { ingredientId: 'not-a-uuid' },
      })
      expectStatus(res, HTTP_STATUS.BAD_REQUEST)
    })
  })

  describe('POST /ingredients/:ingredientId/tags', () => {
    it('should add a tag to an ingredient', async () => {
      const adminToken = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)
      const ingredient = await createIngredient(client, contributorToken)
      const tag = await createTag(client, adminToken)

      const res = await client.ingredients[':ingredientId'].tags.$post(
        { param: { ingredientId: ingredient.id }, json: { tagId: tag.id } },
        withAuth(adminToken)
      )

      expectStatus(res, HTTP_STATUS.CREATED)
      const data = await res.json()
      if (!data.success) throw new Error('add tag failed')
      expect(data.data.ingredientTagId).toBe(tag.id)
      expect(data.data.ingredientId).toBe(ingredient.id)
    })

    it('should reject duplicate tag link', async () => {
      const adminToken = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)
      const ingredient = await createIngredient(client, contributorToken)
      const tag = await createTag(client, adminToken)

      await client.ingredients[':ingredientId'].tags.$post(
        { param: { ingredientId: ingredient.id }, json: { tagId: tag.id } },
        withAuth(adminToken)
      )
      const res = await client.ingredients[':ingredientId'].tags.$post(
        { param: { ingredientId: ingredient.id }, json: { tagId: tag.id } },
        withAuth(adminToken)
      )

      expectStatus(res, HTTP_STATUS.CONFLICT)
    })

    it('should reject invalid tagId (non-UUID)', async () => {
      const adminToken = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)
      const ingredient = await createIngredient(client, contributorToken)

      const res = await client.ingredients[':ingredientId'].tags.$post(
        { param: { ingredientId: ingredient.id }, json: { tagId: 'not-a-uuid' } },
        withAuth(adminToken)
      )

      expectStatus(res, HTTP_STATUS.BAD_REQUEST)
    })

    expectRequiresAuth(() => app, {
      method: 'POST',
      path: `/api/ingredients/${crypto.randomUUID()}/tags`,
      body: { tagId: crypto.randomUUID() },
    })

    describe('role enforcement', () => {
      expectRoleMatrix(
        () => app,
        async () => {
          const ingredient = await createIngredient(client, contributorToken)
          const tag = await createTag(client, contributorToken)
          return {
            method: 'POST',
            path: `/api/ingredients/${ingredient.id}/tags`,
            body: { tagId: tag.id },
          }
        },
        {
          user: HTTP_STATUS.FORBIDDEN,
          contributor: HTTP_STATUS.FORBIDDEN,
          admin: HTTP_STATUS.CREATED,
        }
      )
    })
  })

  describe('DELETE /ingredients/:ingredientId/tags/:tagId', () => {
    it('should remove a tag from an ingredient', async () => {
      const adminToken = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)
      const ingredient = await createIngredient(client, contributorToken)
      const tag = await createTag(client, adminToken)

      await client.ingredients[':ingredientId'].tags.$post(
        { param: { ingredientId: ingredient.id }, json: { tagId: tag.id } },
        withAuth(adminToken)
      )
      const res = await client.ingredients[':ingredientId'].tags[':tagId'].$delete(
        { param: { ingredientId: ingredient.id, tagId: tag.id } },
        withAuth(adminToken)
      )

      expectStatus(res, HTTP_STATUS.NO_CONTENT)
    })

    it('should no longer appear in list after removal', async () => {
      const adminToken = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)
      const ingredient = await createIngredient(client, contributorToken)
      const tag = await createTag(client, adminToken)

      await client.ingredients[':ingredientId'].tags.$post(
        { param: { ingredientId: ingredient.id }, json: { tagId: tag.id } },
        withAuth(adminToken)
      )
      await client.ingredients[':ingredientId'].tags[':tagId'].$delete(
        { param: { ingredientId: ingredient.id, tagId: tag.id } },
        withAuth(adminToken)
      )

      const res = await client.ingredients[':ingredientId'].tags.$get({
        param: { ingredientId: ingredient.id },
      })
      const data = await res.json()
      if (!data.success) throw new Error('list tags failed')
      expect(data.data).toEqual([])
    })

    expectRequiresAuth(() => app, {
      method: 'DELETE',
      path: `/api/ingredients/${crypto.randomUUID()}/tags/${crypto.randomUUID()}`,
    })
  })

  describe('PUT /ingredients/:ingredientId/tags', () => {
    it('should replace all tags for an ingredient', async () => {
      const adminToken = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)
      const ingredient = await createIngredient(client, contributorToken)
      const tag1 = await createTag(client, adminToken, 'Tag 1')
      const tag2 = await createTag(client, adminToken, 'Tag 2')

      await client.ingredients[':ingredientId'].tags.$post(
        { param: { ingredientId: ingredient.id }, json: { tagId: tag1.id } },
        withAuth(adminToken)
      )
      const res = await client.ingredients[':ingredientId'].tags.$put(
        { param: { ingredientId: ingredient.id }, json: { tags: [{ tagId: tag2.id }] } },
        withAuth(adminToken)
      )

      expectStatus(res, HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('put tags failed')
      expect(data.data).toHaveLength(1)
      expect(data.data[0]?.ingredientTagId).toBe(tag2.id)
    })

    it('should clear all tags when tagIds is empty', async () => {
      const adminToken = await setupAndLoginAdmin(app, TEST_CREDENTIALS.admin)
      const ingredient = await createIngredient(client, contributorToken)
      const tag = await createTag(client, adminToken)

      await client.ingredients[':ingredientId'].tags.$post(
        { param: { ingredientId: ingredient.id }, json: { tagId: tag.id } },
        withAuth(adminToken)
      )
      const res = await client.ingredients[':ingredientId'].tags.$put(
        { param: { ingredientId: ingredient.id }, json: { tags: [] } },
        withAuth(adminToken)
      )

      expectStatus(res, HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('put tags failed')
      expect(data.data).toEqual([])
    })

    expectRequiresAuth(() => app, {
      method: 'PUT',
      path: `/api/ingredients/${crypto.randomUUID()}/tags`,
      body: { tagIds: [] },
    })
  })
})
