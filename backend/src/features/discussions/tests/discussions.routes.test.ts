import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { createTestApp } from '../../../tests/helpers/createTestApp'
import { authDelete, authPost, setupAndLogin } from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'

const VALID_PRODUCT = {
  name: 'Vitamine C Discussions',
  brand: 'Solgar',
  kind: 'complément',
  unit: 'gélule',
}
const VALID_THREAD = {
  title: "Ce produit m'a fait des boutons",
  content: 'Détail de mon expérience ici.',
}
const VALID_REPLY = { content: 'Pareil pour moi.' }

describe('Product Discussion Routes', () => {
  let app: Hono<AppEnv>

  beforeEach(async () => {
    app = await createTestApp()
  })

  async function createProductAndGetSlug(token: string) {
    const res = await authPost(app, '/products', token, VALID_PRODUCT)
    const data = await res.json()
    return data.data.slug as string
  }

  describe('POST /products/:slug/discussions', () => {
    it('should create a thread when authenticated', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const slug = await createProductAndGetSlug(token)

      const res = await authPost(app, `/products/${slug}/discussions`, token, VALID_THREAD)

      expect(res.status).toBe(HTTP_STATUS.CREATED)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.data.title).toBe(VALID_THREAD.title)
      expect(data.data.productId).toBeDefined()
    })

    it('should return 401 when unauthenticated', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const slug = await createProductAndGetSlug(token)

      const res = await app.request(`/products/${slug}/discussions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_THREAD),
      })

      expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('GET /products/:slug/discussions', () => {
    it('should list threads without auth', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const slug = await createProductAndGetSlug(token)
      await authPost(app, `/products/${slug}/discussions`, token, VALID_THREAD)

      const res = await app.request(`/products/${slug}/discussions`)

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.data).toHaveLength(1)
      expect(data.data[0].title).toBe(VALID_THREAD.title)
      expect(data.data[0].replyCount).toBe(0)
    })
  })

  describe('POST /products/:slug/discussions/:threadId/replies', () => {
    it('should add a reply to a thread', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const slug = await createProductAndGetSlug(token)
      const threadRes = await authPost(app, `/products/${slug}/discussions`, token, VALID_THREAD)
      const threadData = await threadRes.json()
      const threadId = threadData.data.id

      const res = await authPost(
        app,
        `/products/${slug}/discussions/${threadId}/replies`,
        token,
        VALID_REPLY
      )

      expect(res.status).toBe(HTTP_STATUS.CREATED)
      const data = await res.json()
      expect(data.data.content).toBe(VALID_REPLY.content)
      expect(data.data.threadId).toBe(threadId)
    })
  })

  describe('GET /products/:slug/discussions/:threadId', () => {
    it('should return thread with replies', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const slug = await createProductAndGetSlug(token)
      const threadRes = await authPost(app, `/products/${slug}/discussions`, token, VALID_THREAD)
      const { data: thread } = await threadRes.json()
      await authPost(app, `/products/${slug}/discussions/${thread.id}/replies`, token, VALID_REPLY)

      const res = await app.request(`/products/${slug}/discussions/${thread.id}`)

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      expect(data.data.id).toBe(thread.id)
      expect(data.data.replies).toHaveLength(1)
      expect(data.data.replies[0].content).toBe(VALID_REPLY.content)
    })
  })

  describe('DELETE /products/:slug/discussions/:threadId', () => {
    it('should delete own thread', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const slug = await createProductAndGetSlug(token)
      const threadRes = await authPost(app, `/products/${slug}/discussions`, token, VALID_THREAD)
      const { data: thread } = await threadRes.json()

      const res = await authDelete(app, `/products/${slug}/discussions/${thread.id}`, token)

      expect(res.status).toBe(204)
    })

    it("should return 403 when trying to delete another user's thread", async () => {
      const token1 = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const token2 = await setupAndLogin(app, TEST_CREDENTIALS.alice)
      const slug = await createProductAndGetSlug(token1)
      const threadRes = await authPost(app, `/products/${slug}/discussions`, token1, VALID_THREAD)
      const { data: thread } = await threadRes.json()

      const res = await authDelete(app, `/products/${slug}/discussions/${thread.id}`, token2)

      expect(res.status).toBe(HTTP_STATUS.FORBIDDEN)
    })
  })
})
