import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@aurore/shared'

import { eq } from 'drizzle-orm'
import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { userBans } from '../../../db/schema/auth/user-bans'
import { profiles } from '../../../db/schema/auth/users'
import { discussionReplies, discussionThreads } from '../../../db/schema/products/discussions'
import { products } from '../../../db/schema/products/products'
import { socialPostReplies, socialPosts } from '../../../db/schema/social/posts'
import { testDb } from '../../../tests/db.test.config'
import { setupDbTests } from '../../../tests/db-setup'
import { createTestEnv, type TestClient, withAuth } from '../../../tests/helpers/createTestClient'
import { loginAndGetToken } from '../../../tests/helpers/route-test-helpers'
import { createTestUser } from '../../../tests/helpers/test-factories'

setupDbTests()

describe('Social reactions routes', () => {
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

  async function createPost(token: string) {
    const res = await client.social.posts.$post(
      { json: { content: 'Ma rosacée va mieux.', tone: 'principal', concernSlug: 'rosacee' } },
      withAuth(token)
    )
    const data = await res.json()
    if (!data.success) throw new Error('post creation failed')
    return data.data.id
  }

  it('reacts on a post and reads back the signed reactor (no count)', async () => {
    const author = await makeUser('author@react.test')
    const postId = await createPost(author.token)

    const res = await client.social.reactions.$post(
      { json: { reactableType: 'post', reactableId: postId, kind: 'merci' } },
      withAuth(author.token)
    )
    expect(res.status).toBe(HTTP_STATUS.OK)
    const data = await res.json()
    if (!data.success) throw new Error('expected ok')

    expect(data.data.reactions.merci).toEqual([{ username: 'author', profilePublic: false }])
    expect(data.data.reactions['moi-aussi']).toEqual([])
    expect(data.data.reactions.soutien).toEqual([])
    expect(data.data.viewerKinds).toEqual(['merci'])
    // Zero-counter doctrine (ADR-0013): no total anywhere in the payload.
    expect(JSON.stringify(data.data)).not.toContain('count')
  })

  it('toggles off via DELETE and is idempotent on repeated POST', async () => {
    const author = await makeUser('author@react.test')
    const postId = await createPost(author.token)
    const body = { reactableType: 'post' as const, reactableId: postId, kind: 'merci' as const }

    // Re-POST the same kind: idempotent, never a second row.
    await client.social.reactions.$post({ json: body }, withAuth(author.token))
    const again = await client.social.reactions.$post({ json: body }, withAuth(author.token))
    const againData = await again.json()
    if (!againData.success) throw new Error('expected ok')
    expect(againData.data.reactions.merci).toHaveLength(1)

    const del = await client.social.reactions.$delete({ json: body }, withAuth(author.token))
    expect(del.status).toBe(HTTP_STATUS.OK)
    const delData = await del.json()
    if (!delData.success) throw new Error('expected ok')
    expect(delData.data.reactions.merci).toEqual([])
    expect(delData.data.viewerKinds).toEqual([])
  })

  it('lets one user hold several kinds on the same target at once (multi-kind)', async () => {
    const author = await makeUser('author@react.test')
    const postId = await createPost(author.token)

    await client.social.reactions.$post(
      { json: { reactableType: 'post', reactableId: postId, kind: 'merci' } },
      withAuth(author.token)
    )
    const res = await client.social.reactions.$post(
      { json: { reactableType: 'post', reactableId: postId, kind: 'soutien' } },
      withAuth(author.token)
    )
    const data = await res.json()
    if (!data.success) throw new Error('expected ok')
    expect(data.data.reactions.merci).toHaveLength(1)
    expect(data.data.reactions.soutien).toHaveLength(1)
    expect(data.data.viewerKinds.sort()).toEqual(['merci', 'soutien'])
  })

  it('lists every reactor of a kind, signed (two users)', async () => {
    const author = await makeUser('author@react.test')
    const other = await makeUser('other@react.test')
    const postId = await createPost(author.token)
    const body = { reactableType: 'post' as const, reactableId: postId, kind: 'moi-aussi' as const }

    await client.social.reactions.$post({ json: body }, withAuth(author.token))
    await client.social.reactions.$post({ json: body }, withAuth(other.token))

    // Anonymous read: signed list, viewer has no own kinds.
    const get = await client.social.reactions.$get({
      query: { reactableType: 'post', reactableId: postId },
    })
    expect(get.status).toBe(HTTP_STATUS.OK)
    const data = await get.json()
    if (!data.success) throw new Error('expected ok')
    const names = data.data.reactions['moi-aussi'].map((r) => r.username).sort()
    expect(names).toEqual(['author', 'other'])
    expect(data.data.viewerKinds).toEqual([])
  })

  const UNKNOWN_ID = '11111111-1111-4111-8111-111111111111'

  it('collapses an unknown or hidden parent into 404 (anti-enumeration)', async () => {
    const author = await makeUser('author@react.test')
    const postId = await createPost(author.token)

    const unknown = await client.social.reactions.$post(
      { json: { reactableType: 'post', reactableId: UNKNOWN_ID, kind: 'merci' } },
      withAuth(author.token)
    )
    expect(unknown.status as number).toBe(HTTP_STATUS.NOT_FOUND)

    await testDb
      .update(socialPosts)
      .set({ moderationStatus: 'hidden' })
      .where(eq(socialPosts.id, postId))
    const hidden = await client.social.reactions.$post(
      { json: { reactableType: 'post', reactableId: postId, kind: 'merci' } },
      withAuth(author.token)
    )
    expect(hidden.status as number).toBe(HTTP_STATUS.NOT_FOUND)
  })

  it('makes reacting on a Review impossible (invalid reactable_type → 400)', async () => {
    const author = await makeUser('author@react.test')
    // Bypass the typed client: 'review' is outside the enum, so the schema rejects
    // it at the boundary — a Review is never a Reactable (ADR-0013).
    const res = await app.request('/api/social/reactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${author.token}`,
      },
      body: JSON.stringify({ reactableType: 'review', reactableId: UNKNOWN_ID, kind: 'merci' }),
    })
    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST)
  })

  it('rejects unauthenticated reaction (401)', async () => {
    const res = await app.request('/api/social/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reactableType: 'post', reactableId: UNKNOWN_ID, kind: 'merci' }),
    })
    expect(res.status).toBe(HTTP_STATUS.UNAUTHORIZED)
  })

  it('dispatches polymorphically to thread, post_reply, and thread_reply tables', async () => {
    const author = await makeUser('author@react.test')

    const [product] = await testDb
      .insert(products)
      .values({
        createdBy: author.id,
        name: 'Crème Dispatch',
        brand: 'BrandX',
        category: 'skincare',
        kind: 'serum',
        unit: 'dropper',
        slug: 'creme-dispatch',
      })
      .returning()
    if (!product) throw new Error('product seed failed')

    const [thread] = await testDb
      .insert(discussionThreads)
      .values({ productId: product.id, authorId: author.id, title: 'T', content: 'c' })
      .returning()
    if (!thread) throw new Error('thread seed failed')
    const [threadReply] = await testDb
      .insert(discussionReplies)
      .values({ threadId: thread.id, authorId: author.id, content: 'r' })
      .returning()
    if (!threadReply) throw new Error('thread reply seed failed')

    const postId = await createPost(author.token)
    const [postReply] = await testDb
      .insert(socialPostReplies)
      .values({ postId, authorId: author.id, content: 'pr' })
      .returning()
    if (!postReply) throw new Error('post reply seed failed')

    const targets = [
      { reactableType: 'thread' as const, reactableId: thread.id },
      { reactableType: 'thread_reply' as const, reactableId: threadReply.id },
      { reactableType: 'post_reply' as const, reactableId: postReply.id },
    ]
    for (const target of targets) {
      const res = await client.social.reactions.$post(
        { json: { ...target, kind: 'soutien' } },
        withAuth(author.token)
      )
      expect(res.status).toBe(HTTP_STATUS.OK)
      const data = await res.json()
      if (!data.success) throw new Error(`expected ok for ${target.reactableType}`)
      expect(data.data.reactions.soutien).toEqual([{ username: 'author', profilePublic: false }])
    }
  })

  it('rejects a reaction on a reply whose parent thread is hidden (404)', async () => {
    const author = await makeUser('author@react.test')
    const [product] = await testDb
      .insert(products)
      .values({
        createdBy: author.id,
        name: 'Crème Gate',
        brand: 'BrandX',
        category: 'skincare',
        kind: 'serum',
        unit: 'dropper',
        slug: 'creme-gate',
      })
      .returning()
    if (!product) throw new Error('product seed failed')
    const [thread] = await testDb
      .insert(discussionThreads)
      .values({ productId: product.id, authorId: author.id, title: 'T', content: 'c' })
      .returning()
    if (!thread) throw new Error('thread seed failed')
    const [reply] = await testDb
      .insert(discussionReplies)
      .values({ threadId: thread.id, authorId: author.id, content: 'r' })
      .returning()
    if (!reply) throw new Error('reply seed failed')

    // Hide the parent thread only; the reply row stays moderation_status='visible'.
    await testDb
      .update(discussionThreads)
      .set({ moderationStatus: 'hidden' })
      .where(eq(discussionThreads.id, thread.id))

    const res = await client.social.reactions.$post(
      { json: { reactableType: 'thread_reply', reactableId: reply.id, kind: 'soutien' } },
      withAuth(author.token)
    )
    expect(res.status as number).toBe(HTTP_STATUS.NOT_FOUND)
  })

  it('lets a social_post-scoped banned user still react (no dedicated scope)', async () => {
    const author = await makeUser('author@react.test')
    const admin = await makeUser('admin@react.test')
    const postId = await createPost(author.token)

    // social_post ban governs authoring posts, never reactions (ADR-0013): a banned
    // author can still attach a supportive reaction.
    await testDb
      .insert(userBans)
      .values({ userId: author.id, scope: 'social_post', bannedBy: admin.id })
    const res = await client.social.reactions.$post(
      { json: { reactableType: 'post', reactableId: postId, kind: 'merci' } },
      withAuth(author.token)
    )
    expect(res.status).toBe(HTTP_STATUS.OK)
  })

  it('blocks a globally-banned user (the floor)', async () => {
    const author = await makeUser('author@react.test')
    const admin = await makeUser('admin@react.test')

    // Ban first, then the user's first reaction request: requireNotBanned short-
    // circuits before the handler, so the target id is irrelevant (no prior request
    // to poison the per-user ban cache).
    await testDb.insert(userBans).values({ userId: author.id, scope: 'global', bannedBy: admin.id })
    const res = await client.social.reactions.$post(
      { json: { reactableType: 'post', reactableId: UNKNOWN_ID, kind: 'merci' } },
      withAuth(author.token)
    )
    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
  })
})
