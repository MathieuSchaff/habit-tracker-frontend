import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@habit-tracker/shared'

import { eq } from 'drizzle-orm'

import { profiles } from '../../../db/schema/auth/users'
import { discussionReplies, discussionThreads } from '../../../db/schema/products/discussions'
import { products } from '../../../db/schema/products/products'
import { userProductReviews, userProducts } from '../../../db/schema/products/user-products'
import { setupDbTests } from '../../../tests/db-setup'

const ANY_USER_ID = '019d0000-0000-7000-8000-00000000abc1'

import { testDb } from '../../../tests/db.test.config'
import {
  createTestClient,
  type TestClient,
  withAuth,
} from '../../../tests/helpers/createTestClient'
import { TEST_CREDENTIALS } from '../../../tests/helpers/test-credentials'
import { createTestAdminUser, createTestUser } from '../../../tests/helpers/test-factories'

async function login(client: TestClient, email: string, password: string): Promise<string> {
  const res = await client.auth.login.$post({ json: { email, password } })
  const data = await res.json()
  if (!data.success) throw new Error('login failed in moderation test setup')
  return data.data.accessToken
}

async function setupProductAndReview(opts: {
  userId: string
  isPublic?: boolean
}): Promise<{ productSlug: string; reviewId: string }> {
  const [product] = await testDb
    .insert(products)
    .values({
      createdBy: opts.userId,
      name: 'Mod Serum',
      brand: 'ModBrand',
      category: 'skincare',
      kind: 'serum',
      unit: 'dropper',
      slug: `mod-serum-${Math.random().toString(36).slice(2, 8)}`,
    })
    .returning()
  if (!product) throw new Error('product seed failed')

  const [up] = await testDb
    .insert(userProducts)
    .values({ userId: opts.userId, productId: product.id, status: 'in_stock' })
    .returning()
  if (!up) throw new Error('user_product seed failed')

  const [review] = await testDb
    .insert(userProductReviews)
    .values({
      userProductId: up.id,
      tolerance: 4,
      comment: 'public test review',
      isPublic: opts.isPublic ?? true,
    })
    .returning({ id: userProductReviews.id })
  if (!review) throw new Error('review seed failed')

  return { productSlug: product.slug, reviewId: review.id }
}

setupDbTests()

describe('POST /admin/moderation/* + public read filters', () => {
  let client: TestClient
  let userId: string
  let adminId: string
  let userToken: string
  let adminToken: string

  beforeEach(async () => {
    client = await createTestClient()
    const toto = TEST_CREDENTIALS.toto
    const admin = TEST_CREDENTIALS.admin
    const user = await createTestUser(toto.rawEmail, toto.rawPassword)
    const adminUser = await createTestAdminUser(admin.rawEmail, admin.rawPassword)
    userId = user.id
    adminId = adminUser.id
    userToken = await login(client, toto.rawEmail, toto.rawPassword)
    adminToken = await login(client, admin.rawEmail, admin.rawPassword)
    // give the reviewer a username so the public reviews join doesn't drop the row
    await testDb
      .update(profiles)
      .set({ username: 'reviewer-pub' })
      .where(eq(profiles.userId, userId))
  })

  afterEach(async () => {
    await testDb.delete(discussionReplies)
    await testDb.delete(discussionThreads)
    await testDb.delete(userProductReviews)
    await testDb.delete(userProducts)
    await testDb.delete(products)
  })

  it('hides a review from /products/:slug/reviews/public and restores it', async () => {
    const { productSlug, reviewId } = await setupProductAndReview({ userId })

    const before = await client.products[':slug'].reviews.public.$get({
      param: { slug: productSlug },
    })
    const beforeBody = await before.json()
    if (!beforeBody.success) throw new Error('public read failed before mod')
    expect(beforeBody.data.reviews.length).toBe(1)

    const hide = await client.admin.moderation.reviews[':id'].$patch(
      {
        param: { id: reviewId },
        json: { status: 'hidden', reason: 'abuse' },
      },
      withAuth(adminToken)
    )
    expect(hide.status).toBe(HTTP_STATUS.OK)
    const hideBody = await hide.json()
    if (!hideBody.success) throw new Error('moderation failed')
    expect(hideBody.data.moderationStatus).toBe('hidden')
    expect(hideBody.data.moderationReason).toBe('abuse')

    const after = await client.products[':slug'].reviews.public.$get({
      param: { slug: productSlug },
    })
    const afterBody = await after.json()
    if (!afterBody.success) throw new Error('public read failed after mod')
    expect(afterBody.data.reviews.length).toBe(0)

    // Restore → row reappears
    const restore = await client.admin.moderation.reviews[':id'].$patch(
      {
        param: { id: reviewId },
        json: { status: 'visible' },
      },
      withAuth(adminToken)
    )
    expect(restore.status).toBe(HTTP_STATUS.OK)

    const restored = await client.products[':slug'].reviews.public.$get({
      param: { slug: productSlug },
    })
    const restoredBody = await restored.json()
    if (!restoredBody.success) throw new Error('public read failed after restore')
    expect(restoredBody.data.reviews.length).toBe(1)
  })

  it('hides a discussion thread from listThreads (product slug)', async () => {
    const [product] = await testDb
      .insert(products)
      .values({
        createdBy: userId,
        name: 'Thread Serum',
        brand: 'ThreadBrand',
        category: 'skincare',
        kind: 'serum',
        unit: 'dropper',
        slug: `thread-serum-${Math.random().toString(36).slice(2, 8)}`,
      })
      .returning()
    if (!product) throw new Error('product seed failed')

    const [thread] = await testDb
      .insert(discussionThreads)
      .values({
        productId: product.id,
        authorId: userId,
        title: 'Visible thread',
        content: 'hi',
      })
      .returning({ id: discussionThreads.id })
    if (!thread) throw new Error('thread seed failed')

    const before = await client.products[':slug'].discussions.$get(
      { param: { slug: product.slug } },
      withAuth(userToken)
    )
    const beforeBody = await before.json()
    if (!beforeBody.success) throw new Error('list before failed')
    expect(beforeBody.data.length).toBeGreaterThanOrEqual(1)

    const hide = await client.admin.moderation.threads[':id'].$patch(
      { param: { id: thread.id }, json: { status: 'hidden', reason: 'spam' } },
      withAuth(adminToken)
    )
    expect(hide.status).toBe(HTTP_STATUS.OK)

    const after = await client.products[':slug'].discussions.$get(
      { param: { slug: product.slug } },
      withAuth(userToken)
    )
    const afterBody = await after.json()
    if (!afterBody.success) throw new Error('list after failed')
    const hiddenStillVisible = afterBody.data.some((t) => t.id === thread.id)
    expect(hiddenStillVisible).toBe(false)
  })

  it('hides a discussion reply from the thread detail', async () => {
    const [product] = await testDb
      .insert(products)
      .values({
        createdBy: userId,
        name: 'Reply Serum',
        brand: 'ReplyBrand',
        category: 'skincare',
        kind: 'serum',
        unit: 'dropper',
        slug: `reply-serum-${Math.random().toString(36).slice(2, 8)}`,
      })
      .returning()
    if (!product) throw new Error('product seed failed')

    const [thread] = await testDb
      .insert(discussionThreads)
      .values({
        productId: product.id,
        authorId: userId,
        title: 'Thread with reply',
        content: 'hi',
      })
      .returning({ id: discussionThreads.id })
    if (!thread) throw new Error('thread seed failed')

    const [reply] = await testDb
      .insert(discussionReplies)
      .values({ threadId: thread.id, authorId: userId, content: 'visible reply' })
      .returning({ id: discussionReplies.id })
    if (!reply) throw new Error('reply seed failed')

    const before = await client.products[':slug'].discussions[':threadId'].$get(
      { param: { slug: product.slug, threadId: thread.id } },
      withAuth(userToken)
    )
    const beforeBody = await before.json()
    if (!beforeBody.success) throw new Error('thread detail before failed')
    expect(beforeBody.data.replies.length).toBe(1)

    const hide = await client.admin.moderation.replies[':id'].$patch(
      { param: { id: reply.id }, json: { status: 'hidden' } },
      withAuth(adminToken)
    )
    expect(hide.status).toBe(HTTP_STATUS.OK)

    const after = await client.products[':slug'].discussions[':threadId'].$get(
      { param: { slug: product.slug, threadId: thread.id } },
      withAuth(userToken)
    )
    const afterBody = await after.json()
    if (!afterBody.success) throw new Error('thread detail after failed')
    expect(afterBody.data.replies.length).toBe(0)
  })

  it('non-admin gets 403 on all 3 moderation endpoints', async () => {
    const reviewRes = await client.admin.moderation.reviews[':id'].$patch(
      { param: { id: '019d0000-0000-7000-8000-000000000abc' }, json: { status: 'hidden' } },
      withAuth(userToken)
    )
    expect(reviewRes.status as number).toBe(HTTP_STATUS.FORBIDDEN)

    const threadRes = await client.admin.moderation.threads[':id'].$patch(
      { param: { id: '019d0000-0000-7000-8000-000000000abc' }, json: { status: 'hidden' } },
      withAuth(userToken)
    )
    expect(threadRes.status as number).toBe(HTTP_STATUS.FORBIDDEN)

    const replyRes = await client.admin.moderation.replies[':id'].$patch(
      { param: { id: '019d0000-0000-7000-8000-000000000abc' }, json: { status: 'hidden' } },
      withAuth(userToken)
    )
    expect(replyRes.status as number).toBe(HTTP_STATUS.FORBIDDEN)
  })

  it('returns 404 when targeting a non-existing review', async () => {
    const ghost = '019d0000-0000-7000-8000-000000000bad'
    const res = await client.admin.moderation.reviews[':id'].$patch(
      { param: { id: ghost }, json: { status: 'hidden' } },
      withAuth(adminToken)
    )
    expect(res.status as number).toBe(HTTP_STATUS.NOT_FOUND)
  })

  it('rejects whitespace-only reason via zod trim().min(1)', async () => {
    const { reviewId } = await setupProductAndReview({ userId })
    const res = await client.admin.moderation.reviews[':id'].$patch(
      { param: { id: reviewId }, json: { status: 'hidden', reason: '   ' } },
      withAuth(adminToken)
    )
    expect(res.status as number).toBe(HTTP_STATUS.BAD_REQUEST)
  })

  it('force-private profile hides /u/:username and clears on restore', async () => {
    // Set username + flip public so the route returns a row when not force-private
    await testDb
      .update(profiles)
      .set({ username: 'targetable-user', profilePublic: true, bio: 'hello' })
      .where(eq(profiles.userId, userId))

    const before = await client.profiles[':username'].public.$get({
      param: { username: 'targetable-user' },
    })
    expect(before.status).toBe(HTTP_STATUS.OK)

    const hide = await client.admin.moderation.profiles[':userId'].visibility.$patch(
      { param: { userId }, json: { forcedPrivate: true, reason: 'abuse' } },
      withAuth(adminToken)
    )
    expect(hide.status).toBe(HTTP_STATUS.OK)
    const hideBody = await hide.json()
    if (!hideBody.success) throw new Error('hide failed')
    expect(hideBody.data.forcedPrivateByAdmin).toBe(true)
    expect(hideBody.data.forcedPrivateReason).toBe('abuse')

    const after = await client.profiles[':username'].public.$get({
      param: { username: 'targetable-user' },
    })
    expect(after.status as number).toBe(HTTP_STATUS.NOT_FOUND)

    const unhide = await client.admin.moderation.profiles[':userId'].visibility.$patch(
      { param: { userId }, json: { forcedPrivate: false } },
      withAuth(adminToken)
    )
    expect(unhide.status).toBe(HTTP_STATUS.OK)
    const unhideBody = await unhide.json()
    if (!unhideBody.success) throw new Error('unhide failed')
    expect(unhideBody.data.forcedPrivateByAdmin).toBe(false)
    expect(unhideBody.data.forcedPrivateReason).toBeNull()

    const restored = await client.profiles[':username'].public.$get({
      param: { username: 'targetable-user' },
    })
    expect(restored.status).toBe(HTTP_STATUS.OK)
  })

  it('force-private also drops the user public reviews from the list', async () => {
    await testDb
      .update(profiles)
      .set({ username: 'fp-reviewer' })
      .where(eq(profiles.userId, userId))
    const { productSlug } = await setupProductAndReview({ userId })

    const before = await client.products[':slug'].reviews.public.$get({
      param: { slug: productSlug },
    })
    const beforeBody = await before.json()
    if (!beforeBody.success) throw new Error('public reviews before failed')
    expect(beforeBody.data.reviews.length).toBe(1)

    await client.admin.moderation.profiles[':userId'].visibility.$patch(
      { param: { userId }, json: { forcedPrivate: true } },
      withAuth(adminToken)
    )

    const after = await client.products[':slug'].reviews.public.$get({
      param: { slug: productSlug },
    })
    const afterBody = await after.json()
    if (!afterBody.success) throw new Error('public reviews after failed')
    // innerJoin profiles drops the review when the pseudonym policy stops matching.
    expect(afterBody.data.reviews.length).toBe(0)
  })

  it('force-private non-admin → 403', async () => {
    const res = await client.admin.moderation.profiles[':userId'].visibility.$patch(
      { param: { userId: ANY_USER_ID }, json: { forcedPrivate: true } },
      withAuth(userToken)
    )
    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
  })

  it('force-private 404 when target profile row does not exist', async () => {
    const ghost = '019d0000-0000-7000-8000-00000000bad1'
    const res = await client.admin.moderation.profiles[':userId'].visibility.$patch(
      { param: { userId: ghost }, json: { forcedPrivate: true } },
      withAuth(adminToken)
    )
    expect(res.status as number).toBe(HTTP_STATUS.NOT_FOUND)
  })

  it('admin GET preview returns content even when moderation_status=hidden', async () => {
    const { reviewId } = await setupProductAndReview({ userId })
    // hide first
    await client.admin.moderation.reviews[':id'].$patch(
      { param: { id: reviewId }, json: { status: 'hidden', reason: 'abuse' } },
      withAuth(adminToken)
    )

    const res = await client.admin.moderation.reviews[':id'].$get(
      { param: { id: reviewId } },
      withAuth(adminToken)
    )
    expect(res.status).toBe(HTTP_STATUS.OK)
    const body = await res.json()
    if (!body.success) throw new Error('preview failed')
    expect(body.data.kind).toBe('review')
    expect(body.data.moderationStatus).toBe('hidden')
    expect(body.data.moderationReason).toBe('abuse')
    if (body.data.kind === 'review') {
      expect(body.data.comment).toBe('public test review')
    }
  })

  it('admin GET preview thread + reply', async () => {
    const [product] = await testDb
      .insert(products)
      .values({
        createdBy: userId,
        name: 'Preview Serum',
        brand: 'PreviewBrand',
        category: 'skincare',
        kind: 'serum',
        unit: 'dropper',
        slug: `preview-${Math.random().toString(36).slice(2, 8)}`,
      })
      .returning()
    if (!product) throw new Error('product seed failed')
    const [thread] = await testDb
      .insert(discussionThreads)
      .values({
        productId: product.id,
        authorId: userId,
        title: 'Preview thread',
        content: 'hello',
      })
      .returning({ id: discussionThreads.id })
    if (!thread) throw new Error('thread seed failed')
    const [reply] = await testDb
      .insert(discussionReplies)
      .values({ threadId: thread.id, authorId: userId, content: 'reply body' })
      .returning({ id: discussionReplies.id })
    if (!reply) throw new Error('reply seed failed')

    const t = await client.admin.moderation.threads[':id'].$get(
      { param: { id: thread.id } },
      withAuth(adminToken)
    )
    const tBody = await t.json()
    if (!tBody.success) throw new Error('thread preview failed')
    if (tBody.data.kind !== 'thread') throw new Error('expected thread kind')
    expect(tBody.data.title).toBe('Preview thread')

    const r = await client.admin.moderation.replies[':id'].$get(
      { param: { id: reply.id } },
      withAuth(adminToken)
    )
    const rBody = await r.json()
    if (!rBody.success) throw new Error('reply preview failed')
    if (rBody.data.kind !== 'reply') throw new Error('expected reply kind')
    expect(rBody.data.content).toBe('reply body')
  })

  it('admin GET preview 404 when target missing', async () => {
    const ghost = '019d0000-0000-7000-8000-000000000fff'
    const res = await client.admin.moderation.reviews[':id'].$get(
      { param: { id: ghost } },
      withAuth(adminToken)
    )
    expect(res.status as number).toBe(HTTP_STATUS.NOT_FOUND)
  })

  it('non-admin GET preview → 403', async () => {
    const res = await client.admin.moderation.reviews[':id'].$get(
      { param: { id: '019d0000-0000-7000-8000-00000000abcd' } },
      withAuth(userToken)
    )
    expect(res.status as number).toBe(HTTP_STATUS.FORBIDDEN)
  })

  it('records moderatedBy + moderatedAt on the row', async () => {
    const { reviewId } = await setupProductAndReview({ userId })
    const before = Date.now()
    await client.admin.moderation.reviews[':id'].$patch(
      { param: { id: reviewId }, json: { status: 'hidden', reason: 'check audit' } },
      withAuth(adminToken)
    )

    const [row] = await testDb
      .select({
        moderatedBy: userProductReviews.moderatedBy,
        moderatedAt: userProductReviews.moderatedAt,
        moderationReason: userProductReviews.moderationReason,
      })
      .from(userProductReviews)
      .where(eq(userProductReviews.id, reviewId))

    expect(row?.moderatedBy).toBe(adminId)
    expect(row?.moderationReason).toBe('check audit')
    expect(row?.moderatedAt && Date.parse(row.moderatedAt)).toBeGreaterThanOrEqual(before)
  })
})
