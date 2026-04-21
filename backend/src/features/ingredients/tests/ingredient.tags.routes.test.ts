import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { createTestApp } from '../../../tests/helpers/createTestApp'
import {
  authDelete,
  authPost,
  authPut,
  setupAndLogin,
} from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'

async function createIngredient(app: Hono<AppEnv>, token: string, name = 'Rétinol') {
  const res = await authPost(app, '/ingredients', token, { name, type: 'skincare' })
  const data = await res.json()
  return data.data as { id: string; slug: string }
}

async function createTag(app: Hono<AppEnv>, token: string, name = 'Anti-âge') {
  const res = await authPost(app, '/tags', token, { name })
  const data = await res.json()
  return data.data as { id: string; slug: string }
}

describe('Ingredient Tag Routes', () => {
  let app: Hono<AppEnv>

  beforeEach(async () => {
    app = await createTestApp()
  })

  describe('GET /ingredients/:ingredientId/tags', () => {
    it('should return empty list when no tags linked', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const ingredient = await createIngredient(app, token)

      const res = await app.request(`/ingredients/${ingredient.id}/tags`)

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data).toEqual([])
    })

    it('should return tags after adding one', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const ingredient = await createIngredient(app, token)
      const tag = await createTag(app, token)

      await authPost(app, `/ingredients/${ingredient.id}/tags`, token, { tagId: tag.id })

      const res = await app.request(`/ingredients/${ingredient.id}/tags`)
      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.data).toHaveLength(1)
    })

    it('should not require authentication', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const ingredient = await createIngredient(app, token)

      const res = await app.request(`/ingredients/${ingredient.id}/tags`)
      expect(res.status).toBe(HTTP_STATUS.OK)
    })

    it('should reject invalid ingredientId (non-UUID)', async () => {
      const res = await app.request('/ingredients/not-a-uuid/tags')
      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })
  })

  describe('POST /ingredients/:ingredientId/tags', () => {
    it('should add a tag to an ingredient', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const ingredient = await createIngredient(app, token)
      const tag = await createTag(app, token)

      const res = await authPost(app, `/ingredients/${ingredient.id}/tags`, token, {
        tagId: tag.id,
      })

      expect(res.status).toBe(HTTP_STATUS.CREATED)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.tagId).toBe(tag.id)
      expect(data.data.ingredientId).toBe(ingredient.id)
    })

    it('should reject duplicate tag link', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const ingredient = await createIngredient(app, token)
      const tag = await createTag(app, token)

      await authPost(app, `/ingredients/${ingredient.id}/tags`, token, { tagId: tag.id })
      const res = await authPost(app, `/ingredients/${ingredient.id}/tags`, token, {
        tagId: tag.id,
      })

      expect(res.status).toBe(HTTP_STATUS.CONFLICT)
    })

    it('should reject invalid tagId (non-UUID)', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const ingredient = await createIngredient(app, token)

      const res = await authPost(app, `/ingredients/${ingredient.id}/tags`, token, {
        tagId: 'not-a-uuid',
      })

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject unauthenticated request', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const ingredient = await createIngredient(app, token)
      const tag = await createTag(app, token)

      const res = await app.request(`/ingredients/${ingredient.id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId: tag.id }),
      })
      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('DELETE /ingredients/:ingredientId/tags/:tagId', () => {
    it('should remove a tag from an ingredient', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const ingredient = await createIngredient(app, token)
      const tag = await createTag(app, token)

      await authPost(app, `/ingredients/${ingredient.id}/tags`, token, { tagId: tag.id })
      const res = await authDelete(app, `/ingredients/${ingredient.id}/tags/${tag.id}`, token)

      expect(res.status).toBe(HTTP_STATUS.NO_CONTENT)
    })

    it('should no longer appear in list after removal', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const ingredient = await createIngredient(app, token)
      const tag = await createTag(app, token)

      await authPost(app, `/ingredients/${ingredient.id}/tags`, token, { tagId: tag.id })
      await authDelete(app, `/ingredients/${ingredient.id}/tags/${tag.id}`, token)

      const res = await app.request(`/ingredients/${ingredient.id}/tags`)
      const data = await res.json()
      expect(data.data).toEqual([])
    })

    it('should reject unauthenticated request', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const ingredient = await createIngredient(app, token)
      const tag = await createTag(app, token)

      const res = await app.request(`/ingredients/${ingredient.id}/tags/${tag.id}`, {
        method: 'DELETE',
      })
      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('PUT /ingredients/:ingredientId/tags', () => {
    it('should replace all tags for an ingredient', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const ingredient = await createIngredient(app, token)
      const tag1 = await createTag(app, token, 'Tag 1')
      const tag2 = await createTag(app, token, 'Tag 2')

      await authPost(app, `/ingredients/${ingredient.id}/tags`, token, { tagId: tag1.id })
      const res = await authPut(app, `/ingredients/${ingredient.id}/tags`, token, {
        tags: [{ tagId: tag2.id }],
      })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].tagId).toBe(tag2.id)
    })

    it('should clear all tags when tagIds is empty', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const ingredient = await createIngredient(app, token)
      const tag = await createTag(app, token)

      await authPost(app, `/ingredients/${ingredient.id}/tags`, token, { tagId: tag.id })
      const res = await authPut(app, `/ingredients/${ingredient.id}/tags`, token, { tags: [] })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.data).toEqual([])
    })

    it('should reject unauthenticated request', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const ingredient = await createIngredient(app, token)

      const res = await app.request(`/ingredients/${ingredient.id}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagIds: [] }),
      })
      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })
})
