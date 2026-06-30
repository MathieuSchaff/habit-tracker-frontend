import { beforeEach, describe, expect, it } from 'bun:test'

import type { SkinType } from '@aurore/shared'

import { eq } from 'drizzle-orm'

import { profiles, userDermoProfiles } from '../../../db/schema/auth/users'
import { userProductReviews } from '../../../db/schema/products/user-products'
import { createProduct } from '../../../features/products/service'
import { testDb } from '../../../tests/db.test.config'
import { cleanDatabase } from '../../../tests/helpers/db-cleaner'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { createUserProduct, listPublicReviewsForProduct, upsertUserProductReview } from '../service'

async function setProfile(userId: string, username: string, profilePublic = false) {
  await testDb.update(profiles).set({ username, profilePublic }).where(eq(profiles.userId, userId))
}

async function setDermoProfile(
  userId: string,
  opts: {
    skinTypes?: SkinType[]
    fitzpatrickType?: number
    skinTypesPublic?: boolean
    fitzpatrickPublic?: boolean
  }
) {
  await testDb
    .insert(userDermoProfiles)
    .values({
      userId,
      skinTypes: opts.skinTypes ?? null,
      fitzpatrickType: opts.fitzpatrickType ?? null,
      skinTypesPublic: opts.skinTypesPublic ?? false,
      fitzpatrickPublic: opts.fitzpatrickPublic ?? false,
    })
    .onConflictDoUpdate({
      target: userDermoProfiles.userId,
      set: {
        skinTypes: opts.skinTypes ?? null,
        fitzpatrickType: opts.fitzpatrickType ?? null,
        skinTypesPublic: opts.skinTypesPublic ?? false,
        fitzpatrickPublic: opts.fitzpatrickPublic ?? false,
      },
    })
}

async function makeProduct(ownerId: string, name: string) {
  return await createProduct(
    ownerId,
    'admin',
    {
      name,
      brand: 'TestBrand',
      category: 'skincare',
      kind: 'moisturizer',
      unit: 'tube',
    },
    testDb
  )
}

describe('listPublicReviewsForProduct', () => {
  beforeEach(async () => {
    await cleanDatabase()
  })

  it('returns an empty list when no public review exists', async () => {
    const owner = await createTestUser('seed@public-rev.test')
    const product = await makeProduct(owner.id, 'Empty Cream')
    const result = await listPublicReviewsForProduct(testDb, product.slug)
    expect(result).toEqual({ reviews: [] })
  })

  it('lists only public reviews that have a non-empty comment', async () => {
    const alice = await createTestUser('alice@public-rev.test')
    await setProfile(alice.id, 'alice')
    const bob = await createTestUser('bob@public-rev.test')
    await setProfile(bob.id, 'bob')
    const product = await makeProduct(alice.id, 'Shared Cream')
    const aliceUP = await createUserProduct(
      alice.id,
      { productId: product.id, status: 'in_stock' },
      testDb
    )
    const bobUP = await createUserProduct(
      bob.id,
      { productId: product.id, status: 'in_stock' },
      testDb
    )
    await upsertUserProductReview(
      alice.id,
      aliceUP.id,
      { tolerance: 5, comment: 'shared by alice', isPublic: true },
      testDb
    )
    await upsertUserProductReview(
      bob.id,
      bobUP.id,
      { tolerance: 2, comment: 'private bob' },
      testDb
    )

    const result = await listPublicReviewsForProduct(testDb, product.slug)
    expect(result.reviews).toHaveLength(1)
    expect(result.reviews[0]).toMatchObject({
      comment: 'shared by alice',
      reviewer: { username: 'alice', profilePublic: false },
    })
  })

  it('nulls the 6 axes unless the author opted ratings public', async () => {
    const owner = await createTestUser('gate@public-rev.test')
    await setProfile(owner.id, 'gate-rev')
    const product = await makeProduct(owner.id, 'Gate Cream')
    const up = await createUserProduct(
      owner.id,
      { productId: product.id, status: 'in_stock' },
      testDb
    )
    // public + comment, ratings NOT opted in → axes hidden
    await upsertUserProductReview(
      owner.id,
      up.id,
      { tolerance: 5, efficacy: 4, comment: 'hidden numbers', isPublic: true },
      testDb
    )

    const hidden = await listPublicReviewsForProduct(testDb, product.slug)
    expect(hidden.reviews[0]).toMatchObject({
      tolerance: null,
      efficacy: null,
      comment: 'hidden numbers',
    })

    // opt in → axes revealed (isPublic must survive a ratings-only toggle)
    await upsertUserProductReview(owner.id, up.id, { ratingsPublic: true }, testDb)
    const shown = await listPublicReviewsForProduct(testDb, product.slug)
    expect(shown.reviews).toHaveLength(1)
    expect(shown.reviews[0]).toMatchObject({ tolerance: 5, efficacy: 4 })
  })

  it('does not list a public review with no comment (legacy unlisted)', async () => {
    const owner = await createTestUser('legacy@public-rev.test')
    await setProfile(owner.id, 'legacy-rev')
    const ws = await createTestUser('legacy-ws@public-rev.test')
    await setProfile(ws.id, 'legacy-ws-rev')
    const product = await makeProduct(owner.id, 'Legacy Cream')
    const up = await createUserProduct(
      owner.id,
      { productId: product.id, status: 'in_stock' },
      testDb
    )
    const wsUp = await createUserProduct(
      ws.id,
      { productId: product.id, status: 'in_stock' },
      testDb
    )
    // seed-style legacy rows: public but comment-less (null) or whitespace-only — both unlisted.
    await testDb.insert(userProductReviews).values([
      { userProductId: up.id, tolerance: 4, isPublic: true },
      { userProductId: wsUp.id, tolerance: 4, comment: '   ', isPublic: true },
    ])

    const result = await listPublicReviewsForProduct(testDb, product.slug)
    expect(result.reviews).toEqual([])
  })

  it('rejects publishing a review without a public comment', async () => {
    const owner = await createTestUser('reqc@public-rev.test')
    await setProfile(owner.id, 'reqc-rev')
    const product = await makeProduct(owner.id, 'ReqComment Cream')
    const up = await createUserProduct(
      owner.id,
      { productId: product.id, status: 'in_stock' },
      testDb
    )
    await upsertUserProductReview(owner.id, up.id, { tolerance: 4 }, testDb) // private, fine

    await expect(
      upsertUserProductReview(owner.id, up.id, { isPublic: true }, testDb)
    ).rejects.toThrow('public_review_requires_comment')
  })

  it('allows toggling public when a comment already exists (payload omits comment)', async () => {
    const owner = await createTestUser('toggle@public-rev.test')
    await setProfile(owner.id, 'toggle-rev')
    const product = await makeProduct(owner.id, 'Toggle Cream')
    const up = await createUserProduct(
      owner.id,
      { productId: product.id, status: 'in_stock' },
      testDb
    )
    await upsertUserProductReview(owner.id, up.id, { comment: 'written first' }, testDb)
    await upsertUserProductReview(owner.id, up.id, { isPublic: true }, testDb) // must not throw

    const result = await listPublicReviewsForProduct(testDb, product.slug)
    expect(result.reviews).toHaveLength(1)
  })

  it('exposes reviewer.profilePublic for the link-vs-plaintext decision', async () => {
    const open = await createTestUser('open@public-rev.test')
    await setProfile(open.id, 'open-rev', true)
    const shy = await createTestUser('shy@public-rev.test')
    await setProfile(shy.id, 'shy-rev', false)
    const product = await makeProduct(open.id, 'Mixed Cream')
    const openUP = await createUserProduct(
      open.id,
      { productId: product.id, status: 'in_stock' },
      testDb
    )
    const shyUP = await createUserProduct(
      shy.id,
      { productId: product.id, status: 'in_stock' },
      testDb
    )
    await upsertUserProductReview(open.id, openUP.id, { comment: 'a', isPublic: true }, testDb)
    await upsertUserProductReview(shy.id, shyUP.id, { comment: 'b', isPublic: true }, testDb)

    const result = await listPublicReviewsForProduct(testDb, product.slug)
    const byUsername = Object.fromEntries(
      result.reviews.map((r) => [r.reviewer.username, r.reviewer.profilePublic])
    )
    expect(byUsername).toEqual({ 'open-rev': true, 'shy-rev': false })
  })

  it('skips reviewers whose profile has no username', async () => {
    const owner = await createTestUser('noname@public-rev.test')
    // Pseudonyms are assigned at profile creation, so the username is never null
    // through the normal flow; force it to cover the isNotNull guard that still
    // defends against legacy/admin-created rows.
    await testDb.update(profiles).set({ username: null }).where(eq(profiles.userId, owner.id))
    const product = await makeProduct(owner.id, 'Anon Cream')
    const up = await createUserProduct(
      owner.id,
      { productId: product.id, status: 'in_stock' },
      testDb
    )
    await upsertUserProductReview(owner.id, up.id, { comment: 'c', isPublic: true }, testDb)
    const result = await listPublicReviewsForProduct(testDb, product.slug)
    expect(result.reviews).toEqual([])
  })

  it('orders reviews newest first', async () => {
    const a = await createTestUser('first@public-rev.test')
    await setProfile(a.id, 'first-rev')
    const b = await createTestUser('second@public-rev.test')
    await setProfile(b.id, 'second-rev')
    const product = await makeProduct(a.id, 'Ordered Cream')
    const aUP = await createUserProduct(a.id, { productId: product.id, status: 'in_stock' }, testDb)
    await upsertUserProductReview(a.id, aUP.id, { comment: 'older', isPublic: true }, testDb)
    await new Promise((r) => setTimeout(r, 10))
    const bUP = await createUserProduct(b.id, { productId: product.id, status: 'in_stock' }, testDb)
    await upsertUserProductReview(b.id, bUP.id, { comment: 'newer', isPublic: true }, testDb)

    const result = await listPublicReviewsForProduct(testDb, product.slug)
    expect(result.reviews.map((r) => r.reviewer.username)).toEqual(['second-rev', 'first-rev'])
  })

  it('exposes skinTypes and fitzpatrickType when skinTypesPublic is true', async () => {
    const owner = await createTestUser('skin-on@public-rev.test')
    await setProfile(owner.id, 'skin-on-rev')
    await setDermoProfile(owner.id, {
      skinTypes: ['peau-seche', 'peau-sensible'],
      fitzpatrickType: 2,
      skinTypesPublic: true,
      fitzpatrickPublic: true,
    })
    const product = await makeProduct(owner.id, 'Skin On Cream')
    const up = await createUserProduct(
      owner.id,
      { productId: product.id, status: 'in_stock' },
      testDb
    )
    await upsertUserProductReview(
      owner.id,
      up.id,
      { comment: 'dry and sensitive', isPublic: true },
      testDb
    )

    const result = await listPublicReviewsForProduct(testDb, product.slug)
    expect(result.reviews[0].reviewer).toMatchObject({
      skinTypes: ['peau-seche', 'peau-sensible'],
      fitzpatrickType: 2,
    })
  })

  it('nulls skinTypes and fitzpatrickType when skinTypesPublic is false', async () => {
    const owner = await createTestUser('skin-off@public-rev.test')
    await setProfile(owner.id, 'skin-off-rev')
    await setDermoProfile(owner.id, {
      skinTypes: ['peau-grasse'],
      fitzpatrickType: 4,
      skinTypesPublic: false,
    })
    const product = await makeProduct(owner.id, 'Skin Off Cream')
    const up = await createUserProduct(
      owner.id,
      { productId: product.id, status: 'in_stock' },
      testDb
    )
    await upsertUserProductReview(
      owner.id,
      up.id,
      { comment: 'kept private', isPublic: true },
      testDb
    )

    const result = await listPublicReviewsForProduct(testDb, product.slug)
    expect(result.reviews[0].reviewer).toMatchObject({
      skinTypes: null,
      fitzpatrickType: null,
    })
  })

  it('nulls skinTypes and fitzpatrickType when no dermo profile exists (LEFT JOIN)', async () => {
    const owner = await createTestUser('no-dermo@public-rev.test')
    await setProfile(owner.id, 'no-dermo-rev')
    // intentionally no setDermoProfile call
    const product = await makeProduct(owner.id, 'No Dermo Cream')
    const up = await createUserProduct(
      owner.id,
      { productId: product.id, status: 'in_stock' },
      testDb
    )
    await upsertUserProductReview(
      owner.id,
      up.id,
      { comment: 'no dermo profile', isPublic: true },
      testDb
    )

    const result = await listPublicReviewsForProduct(testDb, product.slug)
    expect(result.reviews[0].reviewer).toMatchObject({
      skinTypes: null,
      fitzpatrickType: null,
    })
  })

  it('nulls fitzpatrickType when fitzpatrickPublic is false even if skinTypesPublic is true', async () => {
    const owner = await createTestUser('fitz-off@public-rev.test')
    await setProfile(owner.id, 'fitz-off-rev')
    await setDermoProfile(owner.id, {
      skinTypes: ['peau-mixte'],
      fitzpatrickType: 3,
      skinTypesPublic: true,
      fitzpatrickPublic: false,
    })
    const product = await makeProduct(owner.id, 'Fitz Off Cream')
    const up = await createUserProduct(
      owner.id,
      { productId: product.id, status: 'in_stock' },
      testDb
    )
    await upsertUserProductReview(
      owner.id,
      up.id,
      { comment: 'split flags', isPublic: true },
      testDb
    )

    const result = await listPublicReviewsForProduct(testDb, product.slug)
    expect(result.reviews[0].reviewer).toMatchObject({
      skinTypes: ['peau-mixte'],
      fitzpatrickType: null,
    })
  })
})
