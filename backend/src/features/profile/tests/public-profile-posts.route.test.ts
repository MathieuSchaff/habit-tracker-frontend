import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS, type PostTone, type SocialPostSurfaceView } from '@aurore/shared'

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

type PostSeed = {
  content?: string
  tone?: PostTone
  concernSlug?: string
  moderationStatus?: 'visible' | 'hidden'
}

// Seed a profile (public by default) with one concern-anchored post owned by them.
async function seedPoster(
  username: string,
  post: PostSeed = {},
  profile: { profilePublic?: boolean; forcedPrivateByAdmin?: boolean } = {}
) {
  const { profilePublic = true, forcedPrivateByAdmin = false } = profile
  const {
    content = 'Ma rosacée va mieux.',
    tone = 'principal',
    concernSlug = 'rosacee',
    moderationStatus = 'visible',
  } = post

  const owner = await createTestUser(`${username}@social.test`, 'Azerty123!')
  await testDb
    .update(profiles)
    .set({ username, profilePublic, forcedPrivateByAdmin })
    .where(eq(profiles.userId, owner.id))

  await testDb.insert(socialPosts).values({
    authorId: owner.id,
    content,
    tone,
    concernSlug,
    moderationStatus,
  })

  return { ownerId: owner.id }
}

describe('GET /profiles/:username/posts', () => {
  let app: Hono<AppEnv>

  beforeEach(async () => {
    app = await createTestApp()
  })

  async function postsOf(username: string) {
    const res = await app.request(`/api/profiles/${username}/posts`)
    expect(res.status).toBe(HTTP_STATUS.OK)
    const body = (await res.json()) as {
      success: true
      data: { posts: SocialPostSurfaceView[] }
    }
    return body.data.posts
  }

  it("lists a user's visible posts", async () => {
    await seedPoster('poster-pub', { content: 'Ma rosacée va mieux.', tone: 'principal' })
    const posts = await postsOf('poster-pub')
    expect(posts).toHaveLength(1)
    expect(posts[0].content).toBe('Ma rosacée va mieux.')
    expect(posts[0].tone).toBe('principal')
  })

  it('excludes a moderation-hidden post', async () => {
    await seedPoster('poster-hidden', { moderationStatus: 'hidden' })
    expect(await postsOf('poster-hidden')).toHaveLength(0)
  })

  it('returns an empty list for a non-public profile (master gate)', async () => {
    await seedPoster('poster-shy', {}, { profilePublic: false })
    expect(await postsOf('poster-shy')).toHaveLength(0)
  })

  it('returns an empty list for an admin-force-privated profile', async () => {
    await seedPoster('poster-forced', {}, { forcedPrivateByAdmin: true })
    expect(await postsOf('poster-forced')).toHaveLength(0)
  })

  it('returns an empty list for an unknown username (anti-enumeration)', async () => {
    expect(await postsOf('ghost')).toHaveLength(0)
  })

  it('resolves a product anchor to its slug and name (porte-produits link-out)', async () => {
    const owner = await createTestUser('poster-anchor@social.test', 'Azerty123!')
    await testDb
      .update(profiles)
      .set({ username: 'poster-anchor', profilePublic: true })
      .where(eq(profiles.userId, owner.id))
    const [product] = await testDb
      .insert(products)
      .values({
        createdBy: owner.id,
        name: 'Crème Apaisante',
        brand: 'BrandX',
        category: 'skincare',
        kind: 'serum',
        unit: 'dropper',
        slug: 'creme-apaisante-profile',
      })
      .returning()
    if (!product) throw new Error('product seed failed')
    await testDb.insert(socialPosts).values({
      authorId: owner.id,
      content: 'Cette crème calme tout.',
      tone: 'principal',
      productId: product.id,
    })

    const posts = await postsOf('poster-anchor')
    expect(posts).toHaveLength(1)
    expect(posts[0].productAnchor).toEqual({
      slug: 'creme-apaisante-profile',
      name: 'Crème Apaisante',
    })
    expect(posts[0].concernSlug).toBeNull()
  })
})
