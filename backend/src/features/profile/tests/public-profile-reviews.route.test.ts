import { beforeEach, describe, expect, it } from 'bun:test'

import { HTTP_STATUS } from '@aurore/shared'

import { eq } from 'drizzle-orm'
import type { Hono } from 'hono'

import type { AppEnv } from '../../../app-env'
import { profiles } from '../../../db/schema/auth/users'
import { products } from '../../../db/schema/products/products'
import { userProductReviews, userProducts } from '../../../db/schema/products/user-products'
import { testDb } from '../../../tests/db.test.config'
import { setupDbTests } from '../../../tests/db-setup'
import { createTestApp } from '../../../tests/helpers/createTestApp'
import { createTestUser } from '../../../tests/helpers/test-factories'

setupDbTests()

type ReviewSeed = {
  comment?: string | null
  isPublic?: boolean
  ratingsPublic?: boolean
  moderationStatus?: 'visible' | 'hidden'
}

let productSeq = 0

// Seed a profile (public by default) with one product review owned by them.
async function seedReviewer(
  username: string,
  review: ReviewSeed = {},
  profile: { profilePublic?: boolean; forcedPrivateByAdmin?: boolean } = {}
) {
  const { profilePublic = true, forcedPrivateByAdmin = false } = profile
  const {
    comment = 'Belle texture, peau apaisée.',
    isPublic = true,
    ratingsPublic = true,
    moderationStatus = 'visible',
  } = review

  const owner = await createTestUser(`${username}@social.test`, 'Azerty123!')
  await testDb
    .update(profiles)
    .set({ username, profilePublic, forcedPrivateByAdmin })
    .where(eq(profiles.userId, owner.id))

  productSeq += 1
  const [product] = await testDb
    .insert(products)
    .values({
      createdBy: owner.id,
      name: `Sérum ${username}`,
      brand: 'BrandX',
      category: 'skincare',
      kind: 'serum',
      unit: 'dropper',
      slug: `serum-${username}-${productSeq}`,
    })
    .returning()
  if (!product) throw new Error('product seed failed')

  const [up] = await testDb
    .insert(userProducts)
    .values({ userId: owner.id, productId: product.id, status: 'in_stock' })
    .returning()
  if (!up) throw new Error('user_product seed failed')

  await testDb.insert(userProductReviews).values({
    userProductId: up.id,
    comment,
    isPublic,
    // DB check upr_ratings_public_requires_public: ratings can't be public if the
    // review itself isn't.
    ratingsPublic: isPublic && ratingsPublic,
    moderationStatus,
    tolerance: 5,
    efficacy: 4,
  })

  return { ownerId: owner.id, product }
}

async function fetchReviews(app: Hono<AppEnv>, username: string) {
  const res = await app.request(`/api/profiles/${username}/reviews`)
  return res
}

describe('GET /profiles/:username/reviews', () => {
  let app: Hono<AppEnv>

  beforeEach(async () => {
    app = await createTestApp()
  })

  it("lists a user's public reviews with the explicit product", async () => {
    const { product } = await seedReviewer('reviewer-pub')

    const res = await fetchReviews(app, 'reviewer-pub')
    expect(res.status).toBe(HTTP_STATUS.OK)
    const body = (await res.json()) as {
      success: true
      data: {
        reviews: Array<{
          comment: string | null
          product: { slug: string; name: string }
          reviewer: { username: string }
        }>
      }
    }
    expect(body.data.reviews).toHaveLength(1)
    expect(body.data.reviews[0].comment).toBe('Belle texture, peau apaisée.')
    expect(body.data.reviews[0].product).toEqual({ slug: product.slug, name: product.name })
    expect(body.data.reviews[0].reviewer.username).toBe('reviewer-pub')
  })

  async function reviewsOf(username: string) {
    const res = await fetchReviews(app, username)
    expect(res.status).toBe(HTTP_STATUS.OK)
    const body = (await res.json()) as {
      success: true
      data: { reviews: Array<{ tolerance: number | null; efficacy: number | null }> }
    }
    return body.data.reviews
  }

  it('excludes a private review', async () => {
    await seedReviewer('reviewer-priv', { isPublic: false })
    expect(await reviewsOf('reviewer-priv')).toHaveLength(0)
  })

  it('excludes a moderation-hidden review', async () => {
    await seedReviewer('reviewer-hidden', { moderationStatus: 'hidden' })
    expect(await reviewsOf('reviewer-hidden')).toHaveLength(0)
  })

  it('excludes a comment-less review (feuille-dépôt without text stays unlisted)', async () => {
    await seedReviewer('reviewer-nocomment', { comment: '   ' })
    expect(await reviewsOf('reviewer-nocomment')).toHaveLength(0)
  })

  it('nulls the ratings when the author did not opt in', async () => {
    await seedReviewer('reviewer-noratings', { ratingsPublic: false })
    const reviews = await reviewsOf('reviewer-noratings')
    expect(reviews).toHaveLength(1)
    expect(reviews[0].tolerance).toBeNull()
    expect(reviews[0].efficacy).toBeNull()
  })

  it('returns an empty list for a non-public profile (master gate)', async () => {
    await seedReviewer('reviewer-shy', {}, { profilePublic: false })
    expect(await reviewsOf('reviewer-shy')).toHaveLength(0)
  })

  it('returns an empty list for an admin-force-privated profile', async () => {
    await seedReviewer('reviewer-forced', {}, { forcedPrivateByAdmin: true })
    expect(await reviewsOf('reviewer-forced')).toHaveLength(0)
  })

  it('returns an empty list for an unknown username (anti-enumeration)', async () => {
    expect(await reviewsOf('ghost')).toHaveLength(0)
  })
})
