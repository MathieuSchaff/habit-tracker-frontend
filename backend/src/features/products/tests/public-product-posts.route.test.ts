import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS, type SocialPostSurfaceView } from '@aurore/shared'

import { eq } from 'drizzle-orm'
import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { profiles } from '../../../db/schema/auth/users'
import { products } from '../../../db/schema/products/products'
import { socialPosts } from '../../../db/schema/social/posts'
import { testDb } from '../../../tests/db.test.config'
import { setupDbTests } from '../../../tests/db-setup'
import { createTestApp } from '../../../tests/helpers/createTestApp'
import { createTestUser } from '../../../tests/helpers/test-factories'

setupDbTests()

let productSeq = 0

type PostSeed = {
  content?: string
  tone?: 'principal' | 'coup-de-gueule'
  moderationStatus?: 'visible' | 'hidden'
}

// Seed an author (public by default) and a product, anchor one post to it.
async function seedProductPost(
  authorUsername: string,
  post: PostSeed = {},
  profile: { profilePublic?: boolean; forcedPrivateByAdmin?: boolean } = {}
) {
  const { profilePublic = true, forcedPrivateByAdmin = false } = profile
  const {
    content = 'Cette crème calme tout.',
    tone = 'principal',
    moderationStatus = 'visible',
  } = post

  const owner = await createTestUser(`${authorUsername}@social.test`, 'Azerty123!')
  await testDb
    .update(profiles)
    .set({ username: authorUsername, profilePublic, forcedPrivateByAdmin })
    .where(eq(profiles.userId, owner.id))

  productSeq += 1
  const slug = `creme-${authorUsername}-${productSeq}`
  const [product] = await testDb
    .insert(products)
    .values({
      createdBy: owner.id,
      name: `Crème ${authorUsername}`,
      brand: 'BrandX',
      category: 'skincare',
      kind: 'serum',
      unit: 'dropper',
      slug,
    })
    .returning()
  if (!product) throw new Error('product seed failed')

  await testDb.insert(socialPosts).values({
    authorId: owner.id,
    content,
    tone,
    productId: product.id,
    moderationStatus,
  })

  return { ownerId: owner.id, slug }
}

describe('GET /products/:slug/posts', () => {
  let app: Hono<AppEnv>

  beforeEach(async () => {
    app = await createTestApp()
  })

  async function postsOf(slug: string) {
    const res = await app.request(`/api/products/${slug}/posts`)
    expect(res.status).toBe(HTTP_STATUS.OK)
    const body = (await res.json()) as {
      success: true
      data: { posts: SocialPostSurfaceView[] }
    }
    return body.data.posts
  }

  it('lists a visible post anchored to the product, with its author', async () => {
    const { slug } = await seedProductPost('poster-pub', { content: 'Cette crème calme tout.' })
    const posts = await postsOf(slug)
    expect(posts).toHaveLength(1)
    expect(posts[0].content).toBe('Cette crème calme tout.')
    expect(posts[0].author).toEqual({ username: 'poster-pub', profilePublic: true })
  })

  it('excludes a moderation-hidden post', async () => {
    const { slug } = await seedProductPost('poster-hidden', { moderationStatus: 'hidden' })
    expect(await postsOf(slug)).toHaveLength(0)
  })

  it('excludes a post from an admin-force-privated author', async () => {
    const { slug } = await seedProductPost('poster-forced', {}, { forcedPrivateByAdmin: true })
    expect(await postsOf(slug)).toHaveLength(0)
  })

  it('still lists a non-public author post but flags profilePublic false (link gated client-side)', async () => {
    const { slug } = await seedProductPost('poster-shy', {}, { profilePublic: false })
    const posts = await postsOf(slug)
    expect(posts).toHaveLength(1)
    expect(posts[0].author.profilePublic).toBe(false)
  })

  it('does not leak a post anchored to a different product', async () => {
    const a = await seedProductPost('poster-a', { content: 'À propos de A.' })
    await seedProductPost('poster-b', { content: 'À propos de B.' })
    const posts = await postsOf(a.slug)
    expect(posts).toHaveLength(1)
    expect(posts[0].content).toBe('À propos de A.')
  })

  it('returns an empty list for an unknown product slug', async () => {
    expect(await postsOf('ghost-product')).toHaveLength(0)
  })

  it('excludes a post from an author who has not set a username (no null-author on the wire)', async () => {
    // createProfile now auto-assigns a pseudonym; null it back so the row has no
    // username. Mirror of listPublicReviewsForProduct's isNotNull(username) guard:
    // such a row must not surface (its author.username would be null cast to string).
    const owner = await createTestUser('noname@social.test', 'Azerty123!')
    await testDb.update(profiles).set({ username: null }).where(eq(profiles.userId, owner.id))
    const [product] = await testDb
      .insert(products)
      .values({
        createdBy: owner.id,
        name: 'Crème Anonyme',
        brand: 'BrandX',
        category: 'skincare',
        kind: 'serum',
        unit: 'dropper',
        slug: 'creme-anonyme',
      })
      .returning()
    if (!product) throw new Error('product seed failed')
    await testDb.insert(socialPosts).values({
      authorId: owner.id,
      content: 'auteur sans pseudo',
      tone: 'principal',
      productId: product.id,
    })

    expect(await postsOf('creme-anonyme')).toHaveLength(0)
  })
})
