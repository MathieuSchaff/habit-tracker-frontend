import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@aurore/shared'

import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { setupDbTests } from '../../../tests/db-setup'
import { createTestEnv, type TestClient, withAuth } from '../../../tests/helpers/createTestClient'
import { expectStatus } from '../../../tests/helpers/expectStatus'
import { setupAndLogin, setupAndLoginContributor } from '../../../tests/helpers/route-test-helpers'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'

const VALID_PRODUCT = {
  name: 'Vitamine C Discussions',
  brand: 'Solgar',
  category: 'complement',
  kind: 'gelule',
  unit: 'bottle',
} as const
const VALID_THREAD = {
  title: "Ce produit m'a fait des boutons",
  content: 'Détail de mon expérience ici.',
}
const VALID_REPLY = { content: 'Pareil pour moi.' }

setupDbTests()

describe('Product Discussion Routes', () => {
  let app: Hono<AppEnv>
  let client: TestClient
  // Creating the product fixture now needs contributor+ (catalog-authz); the
  // discussion routes themselves stay open to any authenticated user.
  let contributorToken: string

  beforeEach(async () => {
    const env = await createTestEnv()
    app = env.app
    client = env.client
    contributorToken = await setupAndLoginContributor(app, TEST_CREDENTIALS.contributor)
  })

  async function createProductAndGetSlug() {
    const res = await client.products.$post({ json: VALID_PRODUCT }, withAuth(contributorToken))
    const data = await res.json()
    if (!data.success) throw new Error('product creation failed')
    return data.data.slug
  }

  describe('POST /products/:slug/discussions', () => {
    it('should create a thread when authenticated', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const slug = await createProductAndGetSlug()

      const res = await client.products[':slug'].discussions.$post(
        { json: VALID_THREAD, param: { slug } },
        withAuth(token)
      )

      expect(res.status).toBe(HTTP_STATUS.CREATED)
      const data = await res.json()
      expect(data.success).toBe(true)
      if (!data.success) throw new Error('expected ok')
      expect(data.data.title).toBe(VALID_THREAD.title)
      expect(data.data.productId).toBeDefined()
    })

    it('should return 401 when unauthenticated', async () => {
      const slug = await createProductAndGetSlug()

      const res = await app.request(`/api/products/${slug}/discussions`, {
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
      const slug = await createProductAndGetSlug()
      await client.products[':slug'].discussions.$post(
        { json: VALID_THREAD, param: { slug } },
        withAuth(token)
      )

      const res = await client.products[':slug'].discussions.$get({ param: { slug } })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('expected ok')
      expect(data.data).toHaveLength(1)
      expect(data.data[0]?.title).toBe(VALID_THREAD.title)
      expect(data.data[0]?.replyCount).toBe(0)
    })
  })

  describe('POST /products/:slug/discussions/:threadId/replies', () => {
    it('should add a reply to a thread', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const slug = await createProductAndGetSlug()
      const threadRes = await client.products[':slug'].discussions.$post(
        { json: VALID_THREAD, param: { slug } },
        withAuth(token)
      )
      const threadData = await threadRes.json()
      if (!threadData.success) throw new Error('thread creation failed')
      const threadId = threadData.data.id

      const res = await client.products[':slug'].discussions[':threadId'].replies.$post(
        { json: VALID_REPLY, param: { slug, threadId } },
        withAuth(token)
      )

      expect(res.status).toBe(HTTP_STATUS.CREATED)
      const data = await res.json()
      if (!data.success) throw new Error('expected ok')
      expect(data.data.content).toBe(VALID_REPLY.content)
      expect(data.data.threadId).toBe(threadId)
    })

    it('rejects replies on a thread hidden by admin moderation', async () => {
      const { eq } = await import('drizzle-orm')
      const { discussionThreads } = await import('../../../db/schema/products/discussions')
      const { testDb } = await import('../../../tests/db.test.config')

      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const slug = await createProductAndGetSlug()
      const threadRes = await client.products[':slug'].discussions.$post(
        { json: VALID_THREAD, param: { slug } },
        withAuth(token)
      )
      const threadData = await threadRes.json()
      if (!threadData.success) throw new Error('thread creation failed')
      const threadId = threadData.data.id

      // Simulate admin moderation hiding the thread.
      await testDb
        .update(discussionThreads)
        .set({ moderationStatus: 'hidden' })
        .where(eq(discussionThreads.id, threadId))

      const res = await client.products[':slug'].discussions[':threadId'].replies.$post(
        { json: VALID_REPLY, param: { slug, threadId } },
        withAuth(token)
      )

      // Service throws DiscussionError('thread_not_found') → 404. Route would
      // otherwise silently accept the reply (the response would be 201) which
      // is the bug the moderation_status filter now blocks.
      expectStatus(res, HTTP_STATUS.NOT_FOUND)
    })
  })

  describe('GET /products/:slug/discussions/:threadId', () => {
    it('should return thread with replies', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const slug = await createProductAndGetSlug()
      const threadRes = await client.products[':slug'].discussions.$post(
        { json: VALID_THREAD, param: { slug } },
        withAuth(token)
      )
      const threadJson = await threadRes.json()
      if (!threadJson.success) throw new Error('thread creation failed')
      const thread = threadJson.data
      await client.products[':slug'].discussions[':threadId'].replies.$post(
        { json: VALID_REPLY, param: { slug, threadId: thread.id } },
        withAuth(token)
      )

      const res = await client.products[':slug'].discussions[':threadId'].$get({
        param: { slug, threadId: thread.id },
      })

      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error('expected ok')
      expect(data.data.id).toBe(thread.id)
      expect(data.data.replies).toHaveLength(1)
      expect(data.data.replies[0]?.content).toBe(VALID_REPLY.content)
    })
  })

  describe('DELETE /products/:slug/discussions/:threadId', () => {
    it('should delete own thread', async () => {
      const token = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const slug = await createProductAndGetSlug()
      const threadRes = await client.products[':slug'].discussions.$post(
        { json: VALID_THREAD, param: { slug } },
        withAuth(token)
      )
      const threadJson = await threadRes.json()
      if (!threadJson.success) throw new Error('thread creation failed')
      const thread = threadJson.data

      const res = await client.products[':slug'].discussions[':threadId'].$delete(
        { param: { slug, threadId: thread.id } },
        withAuth(token)
      )

      expect(res.status).toBe(204)
    })

    it("returns the same 404 for another user's thread as for a missing one", async () => {
      const token1 = await setupAndLogin(app, TEST_CREDENTIALS.toto)
      const token2 = await setupAndLogin(app, TEST_CREDENTIALS.alice)
      const slug = await createProductAndGetSlug()
      const threadRes = await client.products[':slug'].discussions.$post(
        { json: VALID_THREAD, param: { slug } },
        withAuth(token1)
      )
      const threadJson = await threadRes.json()
      if (!threadJson.success) throw new Error('thread creation failed')
      const thread = threadJson.data

      // Enumeration guard: cross-user delete must be indistinguishable from
      // deleting a thread that never existed. Both → 404 thread_not_found, so the
      // response cannot be used to probe whether a thread id exists.
      const crossUser = await app.request(`/api/products/${slug}/discussions/${thread.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token2}` },
      })
      const missing = await app.request(
        `/api/products/${slug}/discussions/00000000-0000-0000-0000-000000000000`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token2}` } }
      )

      expect(crossUser.status).toBe(HTTP_STATUS.NOT_FOUND)
      expect(missing.status).toBe(HTTP_STATUS.NOT_FOUND)
      expect(await crossUser.json()).toEqual(await missing.json())
    })
  })
})
