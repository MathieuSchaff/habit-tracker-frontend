/**
 * RLS regression for profiles_select_for_reaction + profiles_select_for_social_post
 * (migration 0108) and profiles_select_for_post_reply (migration 0109). Route-level
 * tests run on the owner pool (RLS bypassed); production runs as app_runtime, so a
 * non-public reactor/author/replier is only visible to the profiles join via these
 * additive policies. Exercised here on a second app_runtime pool (no app.user_id
 * set → anonymous, the worst case).
 *
 * ADR-0013: a signed reaction is public, so the reactor's pseudonym must surface
 * even when their profile is private — but a force-privated user must not.
 */
import { afterAll, describe, expect, it } from 'bun:test'
import { SQL } from 'bun'

import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/bun-sql'

import { profiles } from '../../db/schema/auth/users'
import { products } from '../../db/schema/products/products'
import { socialPostReplies, socialPosts } from '../../db/schema/social/posts'
import { socialReactions } from '../../db/schema/social/reactions'
import { getPostWithReplies, listPostsForProduct } from '../../features/social/posts.service'
import { listReactions } from '../../features/social/reactions.service'
import { testDb } from '../db.test.config'
import { setupDbTests } from '../db-setup'
import { createTestUser } from '../helpers/test-factories'

const APP_DATABASE_URL = process.env.APP_DATABASE_URL
if (!APP_DATABASE_URL) throw new Error('APP_DATABASE_URL not set')

const appRuntimePool = new SQL(APP_DATABASE_URL)
const appRuntimeDb = drizzle(appRuntimePool, {
  schema: await import('../../db/schema'),
}) as unknown as typeof testDb

afterAll(async () => {
  await appRuntimePool.close()
})

setupDbTests()

async function makeReactor(email: string, username: string, overrides = {}) {
  const user = await createTestUser(email, 'Azerty123!')
  await testDb
    .update(profiles)
    .set({ username, profilePublic: false, ...overrides })
    .where(eq(profiles.userId, user.id))
  return user
}

async function makePost(authorId: string) {
  const [post] = await testDb
    .insert(socialPosts)
    .values({ authorId, tone: 'principal', content: 'c', concernSlug: 'rosacee' })
    .returning()
  if (!post) throw new Error('post seed failed')
  return post
}

describe('profiles_select_for_reaction RLS — app_runtime', () => {
  it('surfaces a non-public reactor to the signed list (the critical prod path)', async () => {
    const author = await makeReactor('author@rxn-rls.test', 'rxn-author')
    const reactor = await makeReactor('reactor@rxn-rls.test', 'rxn-reactor')
    const post = await makePost(author.id)
    await testDb.insert(socialReactions).values({
      reactableType: 'post',
      reactableId: post.id,
      userId: reactor.id,
      kind: 'merci',
    })

    const view = await listReactions(appRuntimeDb, 'post', post.id, null)
    expect(view.reactions.merci).toEqual([{ username: 'rxn-reactor', profilePublic: false }])
  })

  it('hides a force-privated reactor even though they reacted', async () => {
    const author = await makeReactor('author2@rxn-rls.test', 'rxn-author2')
    const reactor = await makeReactor('forced@rxn-rls.test', 'rxn-forced', {
      forcedPrivateByAdmin: true,
    })
    const post = await makePost(author.id)
    await testDb.insert(socialReactions).values({
      reactableType: 'post',
      reactableId: post.id,
      userId: reactor.id,
      kind: 'merci',
    })

    const view = await listReactions(appRuntimeDb, 'post', post.id, null)
    expect(view.reactions.merci).toEqual([])
  })
})

describe('profiles_select_for_social_post RLS — app_runtime (T5b twin)', () => {
  it('surfaces a non-public author on the product posts surface', async () => {
    const author = await makeReactor('pauthor@rxn-rls.test', 'rxn-pauthor')
    const [product] = await testDb
      .insert(products)
      .values({
        createdBy: author.id,
        name: 'Crème RLS',
        brand: 'BrandX',
        category: 'skincare',
        kind: 'serum',
        unit: 'dropper',
        slug: 'creme-rls-twin',
      })
      .returning()
    if (!product) throw new Error('product seed failed')
    await testDb.insert(socialPosts).values({
      authorId: author.id,
      tone: 'principal',
      content: 'anchored',
      productId: product.id,
    })

    const { posts } = await listPostsForProduct(appRuntimeDb, 'creme-rls-twin')
    expect(posts.map((p) => p.author.username)).toEqual(['rxn-pauthor'])
  })
})

describe('profiles_select_for_post_reply RLS — app_runtime (migration 0109)', () => {
  async function makeReply(postId: string, authorId: string, overrides = {}) {
    const [reply] = await testDb
      .insert(socialPostReplies)
      .values({ postId, authorId, content: 'r', ...overrides })
      .returning()
    if (!reply) throw new Error('reply seed failed')
    return reply
  }

  it('surfaces a non-public reply author to getPostWithReplies (the critical prod path)', async () => {
    const author = await makeReactor('pauthor@reply-rls.test', 'reply-pauthor')
    const replier = await makeReactor('replier@reply-rls.test', 'reply-replier')
    const post = await makePost(author.id)
    await makeReply(post.id, replier.id)

    const view = await getPostWithReplies(post.id, appRuntimeDb)
    expect(view.replies.map((r) => r.authorName)).toEqual(['reply-replier'])
  })

  it('hides a force-privated reply author, then surfaces them once the flag clears', async () => {
    const author = await makeReactor('pauthor2@reply-rls.test', 'reply-pauthor2')
    const replier = await makeReactor('forced@reply-rls.test', 'reply-forced', {
      forcedPrivateByAdmin: true,
    })
    const post = await makePost(author.id)
    await makeReply(post.id, replier.id)

    // Force-private wins over the policy.
    let view = await getPostWithReplies(post.id, appRuntimeDb)
    expect(view.replies.map((r) => r.authorName)).toEqual([null])

    // Clearing the flag surfaces the same visible reply's author — proves this
    // policy (not another path) grants the non-public replier, so the assertion
    // is not vacuously null.
    await testDb
      .update(profiles)
      .set({ forcedPrivateByAdmin: false })
      .where(eq(profiles.userId, replier.id))
    view = await getPostWithReplies(post.id, appRuntimeDb)
    expect(view.replies.map((r) => r.authorName)).toEqual(['reply-forced'])
  })

  it('gates on reply visibility: hidden reply hides the author, visible surfaces them', async () => {
    const author = await makeReactor('pauthor3@reply-rls.test', 'reply-pauthor3')
    const replier = await makeReactor('hidden@reply-rls.test', 'reply-hidden')
    const post = await makePost(author.id)
    const reply = await makeReply(post.id, replier.id, { moderationStatus: 'hidden' })

    // getPostWithReplies filters hidden replies at the query layer, so probe the
    // policy directly. A non-public user whose only reply is hidden stays invisible.
    const probe = () =>
      appRuntimeDb
        .select({ username: profiles.username })
        .from(profiles)
        .where(eq(profiles.userId, replier.id))
    expect(await probe()).toEqual([])

    // Flip the reply to visible: the moderation gate now admits the author. Proves
    // the 'visible' filter is load-bearing — not the mere absence of a policy.
    await testDb
      .update(socialPostReplies)
      .set({ moderationStatus: 'visible' })
      .where(eq(socialPostReplies.id, reply.id))
    expect(await probe()).toEqual([{ username: 'reply-hidden' }])
  })
})
