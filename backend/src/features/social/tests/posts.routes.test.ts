import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@aurore/shared'

import { eq } from 'drizzle-orm'
import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { userBans } from '../../../db/schema/auth/user-bans'
import { profiles } from '../../../db/schema/auth/users'
import { products } from '../../../db/schema/products/products'
import { socialPosts } from '../../../db/schema/social/posts'
import { testDb } from '../../../tests/db.test.config'
import { setupDbTests } from '../../../tests/db-setup'
import { createTestEnv, type TestClient, withAuth } from '../../../tests/helpers/createTestClient'
import { loginAndGetToken } from '../../../tests/helpers/route-test-helpers'
import { createTestUser } from '../../../tests/helpers/test-factories'

setupDbTests()

const UNKNOWN_ID = '11111111-1111-4111-8111-111111111111'

describe('Social posts routes', () => {
  let app: Hono<AppEnv>
  let client: TestClient

  beforeEach(async () => {
    const env = await createTestEnv()
    app = env.app
    client = env.client
  })

  async function makeUser(email: string) {
    const user = await createTestUser(email, 'Azerty123!')
    const username = email.split('@')[0]
    await testDb.update(profiles).set({ username }).where(eq(profiles.userId, user.id))
    const token = await loginAndGetToken(app, email, 'Azerty123!')
    return { id: user.id, token, username }
  }

  async function createConcernPost(token: string, content = 'Ma rosacée va mieux.') {
    const res = await client.social.posts.$post(
      { json: { content, tone: 'principal', concernSlug: 'rosacee' } },
      withAuth(token)
    )
    return res
  }

  it('creates a concern-anchored post (201) and rejects unauthenticated creation (401)', async () => {
    const { token } = await makeUser('author@social.test')

    const res = await createConcernPost(token)
    expect(res.status).toBe(HTTP_STATUS.CREATED)
    const data = await res.json()
    if (!data.success) throw new Error('expected ok')
    expect(data.data.content).toBe('Ma rosacée va mieux.')
    expect(data.data.tone).toBe('principal')
    expect(data.data.concernSlug).toBe('rosacee')

    const anon = await app.request('/api/social/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'x', tone: 'principal', concernSlug: 'rosacee' }),
    })
    expect(anon.status).toBe(HTTP_STATUS.UNAUTHORIZED)
  })

  it('rejects a post with no anchor (rien ne flotte)', async () => {
    const { token } = await makeUser('author@social.test')
    const res = await client.social.posts.$post(
      { json: { content: 'flottant', tone: 'principal' } },
      withAuth(token)
    )
    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
  })

  it('reads a visible post with its (empty) replies; 404 on unknown and on hidden', async () => {
    const { token } = await makeUser('author@social.test')
    const created = await createConcernPost(token)
    const createdData = await created.json()
    if (!createdData.success) throw new Error('expected ok')
    const postId = createdData.data.id

    const get = await client.social.posts[':postId'].$get({ param: { postId } })
    expect(get.status).toBe(HTTP_STATUS.OK)
    const getData = await get.json()
    if (!getData.success) throw new Error('expected ok')
    expect(getData.data.replyCount).toBe(0)
    expect(getData.data.authorName).toBe('author')

    const unknown = await client.social.posts[':postId'].$get({ param: { postId: UNKNOWN_ID } })
    expect(unknown.status as number).toBe(HTTP_STATUS.NOT_FOUND)

    // Admin hides it → must 404 (anti-enum, same as unknown).
    await testDb
      .update(socialPosts)
      .set({ moderationStatus: 'hidden' })
      .where(eq(socialPosts.id, postId))
    const hidden = await client.social.posts[':postId'].$get({ param: { postId } })
    expect(hidden.status as number).toBe(HTTP_STATUS.NOT_FOUND)
  })

  it("deletes own post (204) but collapses another user's delete into 404 (anti-enum)", async () => {
    const author = await makeUser('author@social.test')
    const other = await makeUser('other@social.test')
    const created = await createConcernPost(author.token)
    const createdData = await created.json()
    if (!createdData.success) throw new Error('expected ok')
    const postId = createdData.data.id

    const byOther = await client.social.posts[':postId'].$delete(
      { param: { postId } },
      withAuth(other.token)
    )
    expect(byOther.status as number).toBe(HTTP_STATUS.NOT_FOUND)

    const byOwner = await client.social.posts[':postId'].$delete(
      { param: { postId } },
      withAuth(author.token)
    )
    expect(byOwner.status).toBe(204)
  })

  it('blocks creation for a user banned on social_post (403)', async () => {
    const author = await makeUser('author@social.test')
    const admin = await makeUser('admin@social.test')
    await testDb
      .insert(userBans)
      .values({ userId: author.id, scope: 'social_post', bannedBy: admin.id })

    const res = await createConcernPost(author.token)
    expect(res.status).toBe(HTTP_STATUS.FORBIDDEN)
  })

  it('accepts a reply on a visible post (201) but rejects one on a hidden post (404)', async () => {
    const author = await makeUser('author@social.test')
    const responder = await makeUser('responder@social.test')
    const created = await createConcernPost(author.token)
    const createdData = await created.json()
    if (!createdData.success) throw new Error('expected ok')
    const postId = createdData.data.id

    const reply = await client.social.posts[':postId'].replies.$post(
      { param: { postId }, json: { content: 'Courage, moi aussi.' } },
      withAuth(responder.token)
    )
    expect(reply.status).toBe(HTTP_STATUS.CREATED)

    await testDb
      .update(socialPosts)
      .set({ moderationStatus: 'hidden' })
      .where(eq(socialPosts.id, postId))
    const onHidden = await client.social.posts[':postId'].replies.$post(
      { param: { postId }, json: { content: 'late' } },
      withAuth(responder.token)
    )
    expect(onHidden.status as number).toBe(HTTP_STATUS.NOT_FOUND)
  })

  it('rejects a post anchored to a non-existent product (404 anchor_not_found)', async () => {
    const { token } = await makeUser('author@social.test')
    const res = await client.social.posts.$post(
      { json: { content: 'fantôme', tone: 'principal', productId: UNKNOWN_ID } },
      withAuth(token)
    )
    expect(res.status as number).toBe(HTTP_STATUS.NOT_FOUND)
  })

  it('stores a real product anchor', async () => {
    const author = await makeUser('author@social.test')
    const [product] = await testDb
      .insert(products)
      .values({
        createdBy: author.id,
        name: 'Crème Test',
        brand: 'BrandX',
        category: 'skincare',
        kind: 'serum',
        unit: 'dropper',
        slug: 'creme-test-anchor',
      })
      .returning()
    if (!product) throw new Error('product seed failed')

    const res = await client.social.posts.$post(
      { json: { content: 'super crème', tone: 'coup-de-gueule', productId: product.id } },
      withAuth(author.token)
    )
    expect(res.status).toBe(HTTP_STATUS.CREATED)
    const data = await res.json()
    if (!data.success) throw new Error('expected ok')
    expect(data.data.productId).toBe(product.id)
    expect(data.data.tone).toBe('coup-de-gueule')
  })
})
