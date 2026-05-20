import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import { createIngredientTag } from '../../../features/ingredient-tags/service'
import { testDb } from '../../../tests/db.test.config'
import { createTestEnv, type TestClient, withAuth } from '../../../tests/helpers/createTestClient'
import { expectStatus } from '../../../tests/helpers/expectStatus'
import { setupAndLogin } from '../../../tests/helpers/route-test-helpers'
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
  // Insert directly via service since no public ingredient-tag-creation route exists.
  const tag = await createIngredientTag(testDb, { name })
  return { id: tag.id, slug: tag.slug }
}

describe('Ingredient Tag Routes', () => {
  let app: TestApp
  let client: TestClient

  beforeEach(async () => {
    ;({ app, client } = await createTestEnv())
  })

  describe('GET /ingredients/:ingredientId/tags', () => {
    it('should return empty list when no tags linked', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const ingredient = await createIngredient(client, token)

      const res = await client.ingredients[':ingredientId'].tags.$get({
        param: { ingredientId: ingredient.id },
      })

      expectStatus(res, HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('list tags failed')
      expect(data.data).toEqual([])
    })

    it('should return tags after adding one', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const ingredient = await createIngredient(client, token)
      const tag = await createTag(client, token)

      await client.ingredients[':ingredientId'].tags.$post(
        { param: { ingredientId: ingredient.id }, json: { tagId: tag.id } },
        withAuth(token)
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
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const ingredient = await createIngredient(client, token)

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
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const ingredient = await createIngredient(client, token)
      const tag = await createTag(client, token)

      const res = await client.ingredients[':ingredientId'].tags.$post(
        { param: { ingredientId: ingredient.id }, json: { tagId: tag.id } },
        withAuth(token)
      )

      expectStatus(res, HTTP_STATUS.CREATED)
      const data = await res.json()
      if (!data.success) throw new Error('add tag failed')
      expect(data.data.ingredientTagId).toBe(tag.id)
      expect(data.data.ingredientId).toBe(ingredient.id)
    })

    it('should reject duplicate tag link', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const ingredient = await createIngredient(client, token)
      const tag = await createTag(client, token)

      await client.ingredients[':ingredientId'].tags.$post(
        { param: { ingredientId: ingredient.id }, json: { tagId: tag.id } },
        withAuth(token)
      )
      const res = await client.ingredients[':ingredientId'].tags.$post(
        { param: { ingredientId: ingredient.id }, json: { tagId: tag.id } },
        withAuth(token)
      )

      expectStatus(res, HTTP_STATUS.CONFLICT)
    })

    it('should reject invalid tagId (non-UUID)', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const ingredient = await createIngredient(client, token)

      const res = await client.ingredients[':ingredientId'].tags.$post(
        { param: { ingredientId: ingredient.id }, json: { tagId: 'not-a-uuid' } },
        withAuth(token)
      )

      expectStatus(res, HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject unauthenticated request', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const ingredient = await createIngredient(client, token)
      const tag = await createTag(client, token)

      const res = await app.request(`/ingredients/${ingredient.id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId: tag.id }),
      })
      expectStatus(res, HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('DELETE /ingredients/:ingredientId/tags/:tagId', () => {
    it('should remove a tag from an ingredient', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const ingredient = await createIngredient(client, token)
      const tag = await createTag(client, token)

      await client.ingredients[':ingredientId'].tags.$post(
        { param: { ingredientId: ingredient.id }, json: { tagId: tag.id } },
        withAuth(token)
      )
      const res = await client.ingredients[':ingredientId'].tags[':tagId'].$delete(
        { param: { ingredientId: ingredient.id, tagId: tag.id } },
        withAuth(token)
      )

      expectStatus(res, HTTP_STATUS.NO_CONTENT)
    })

    it('should no longer appear in list after removal', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const ingredient = await createIngredient(client, token)
      const tag = await createTag(client, token)

      await client.ingredients[':ingredientId'].tags.$post(
        { param: { ingredientId: ingredient.id }, json: { tagId: tag.id } },
        withAuth(token)
      )
      await client.ingredients[':ingredientId'].tags[':tagId'].$delete(
        { param: { ingredientId: ingredient.id, tagId: tag.id } },
        withAuth(token)
      )

      const res = await client.ingredients[':ingredientId'].tags.$get({
        param: { ingredientId: ingredient.id },
      })
      const data = await res.json()
      if (!data.success) throw new Error('list tags failed')
      expect(data.data).toEqual([])
    })

    it('should reject unauthenticated request', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const ingredient = await createIngredient(client, token)
      const tag = await createTag(client, token)

      const res = await app.request(`/ingredients/${ingredient.id}/tags/${tag.id}`, {
        method: 'DELETE',
      })
      expectStatus(res, HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('PUT /ingredients/:ingredientId/tags', () => {
    it('should replace all tags for an ingredient', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const ingredient = await createIngredient(client, token)
      const tag1 = await createTag(client, token, 'Tag 1')
      const tag2 = await createTag(client, token, 'Tag 2')

      await client.ingredients[':ingredientId'].tags.$post(
        { param: { ingredientId: ingredient.id }, json: { tagId: tag1.id } },
        withAuth(token)
      )
      const res = await client.ingredients[':ingredientId'].tags.$put(
        { param: { ingredientId: ingredient.id }, json: { tags: [{ tagId: tag2.id }] } },
        withAuth(token)
      )

      expectStatus(res, HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('put tags failed')
      expect(data.data).toHaveLength(1)
      expect(data.data[0]?.ingredientTagId).toBe(tag2.id)
    })

    it('should clear all tags when tagIds is empty', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const ingredient = await createIngredient(client, token)
      const tag = await createTag(client, token)

      await client.ingredients[':ingredientId'].tags.$post(
        { param: { ingredientId: ingredient.id }, json: { tagId: tag.id } },
        withAuth(token)
      )
      const res = await client.ingredients[':ingredientId'].tags.$put(
        { param: { ingredientId: ingredient.id }, json: { tags: [] } },
        withAuth(token)
      )

      expectStatus(res, HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('put tags failed')
      expect(data.data).toEqual([])
    })

    it('should reject unauthenticated request', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const ingredient = await createIngredient(client, token)

      const res = await app.request(`/ingredients/${ingredient.id}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagIds: [] }),
      })
      expectStatus(res, HTTP_STATUS.UNAUTHORIZED)
    })
  })
})
