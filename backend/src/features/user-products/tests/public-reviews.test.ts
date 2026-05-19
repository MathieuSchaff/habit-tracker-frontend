import { beforeEach, describe, expect, it } from 'bun:test'

import { eq } from 'drizzle-orm'

import { profiles } from '../../../db/schema/auth/users'
import { createProduct } from '../../../features/products/service'
import { testDb } from '../../../tests/db.test.config'
import { cleanDatabase } from '../../../tests/helpers/db-cleaner'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { createUserProduct, listPublicReviewsForProduct, upsertUserProductReview } from '../service'

async function setProfile(userId: string, username: string, profilePublic = false) {
  await testDb.update(profiles).set({ username, profilePublic }).where(eq(profiles.userId, userId))
}

async function makeProduct(ownerId: string, name: string) {
  return await createProduct(
    ownerId,
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

  it('returns empty arrays and zero counts when no review exists', async () => {
    const owner = await createTestUser('seed@public-rev.test')
    const product = await makeProduct(owner.id, 'Empty Cream')

    const result = await listPublicReviewsForProduct(testDb, product.slug)

    expect(result.reviews).toEqual([])
    expect(result.aggregates.total).toBe(0)
    expect(result.aggregates.byAxis.tolerance).toEqual({ low: 0, mid: 0, high: 0 })
    expect(result.aggregates.byAxis.valueForMoney).toEqual({ low: 0, mid: 0, high: 0 })
  })

  it('hides private reviews and surfaces only is_public=true', async () => {
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
      tolerance: 5,
      comment: 'shared by alice',
      reviewer: { username: 'alice', profilePublic: false },
    })
    expect(result.aggregates.total).toBe(1)
    expect(result.aggregates.byAxis.tolerance.high).toBe(1)
  })

  it('exposes reviewer.profilePublic for the link-vs-plaintext UI decision', async () => {
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
    await upsertUserProductReview(open.id, openUP.id, { tolerance: 4, isPublic: true }, testDb)
    await upsertUserProductReview(shy.id, shyUP.id, { tolerance: 3, isPublic: true }, testDb)

    const result = await listPublicReviewsForProduct(testDb, product.slug)

    const byUsername = Object.fromEntries(
      result.reviews.map((r) => [r.reviewer.username, r.reviewer.profilePublic])
    )
    expect(byUsername).toEqual({ 'open-rev': true, 'shy-rev': false })
  })

  it('buckets each axis into low/mid/high (1-2 / 3 / 4-5)', async () => {
    const owner = await createTestUser('agg@public-rev.test')
    await setProfile(owner.id, 'agg-rev')
    const product = await makeProduct(owner.id, 'Bucket Cream')
    const up = await createUserProduct(
      owner.id,
      { productId: product.id, status: 'in_stock' },
      testDb
    )
    await upsertUserProductReview(
      owner.id,
      up.id,
      {
        tolerance: 1,
        efficacy: 2,
        sensoriality: 3,
        stability: 4,
        mixability: 5,
        valueForMoney: null,
        isPublic: true,
      },
      testDb
    )

    const result = await listPublicReviewsForProduct(testDb, product.slug)

    expect(result.aggregates.byAxis.tolerance).toEqual({ low: 1, mid: 0, high: 0 })
    expect(result.aggregates.byAxis.efficacy).toEqual({ low: 1, mid: 0, high: 0 })
    expect(result.aggregates.byAxis.sensoriality).toEqual({ low: 0, mid: 1, high: 0 })
    expect(result.aggregates.byAxis.stability).toEqual({ low: 0, mid: 0, high: 1 })
    expect(result.aggregates.byAxis.mixability).toEqual({ low: 0, mid: 0, high: 1 })
    // null values are not bucketed
    expect(result.aggregates.byAxis.valueForMoney).toEqual({ low: 0, mid: 0, high: 0 })
  })

  it('ignores reviews from other products with the same reviewer', async () => {
    const owner = await createTestUser('multi@public-rev.test')
    await setProfile(owner.id, 'multi-rev')
    const p1 = await makeProduct(owner.id, 'First Cream')
    const p2 = await makeProduct(owner.id, 'Second Cream')
    const up1 = await createUserProduct(owner.id, { productId: p1.id, status: 'in_stock' }, testDb)
    const up2 = await createUserProduct(owner.id, { productId: p2.id, status: 'in_stock' }, testDb)
    await upsertUserProductReview(owner.id, up1.id, { tolerance: 5, isPublic: true }, testDb)
    await upsertUserProductReview(owner.id, up2.id, { tolerance: 1, isPublic: true }, testDb)

    const r1 = await listPublicReviewsForProduct(testDb, p1.slug)

    expect(r1.aggregates.total).toBe(1)
    expect(r1.aggregates.byAxis.tolerance).toEqual({ low: 0, mid: 0, high: 1 })
  })

  it('skips reviewers whose profile has no username', async () => {
    const owner = await createTestUser('noname@public-rev.test')
    // username left null intentionally
    const product = await makeProduct(owner.id, 'Anon Cream')
    const up = await createUserProduct(
      owner.id,
      { productId: product.id, status: 'in_stock' },
      testDb
    )
    await upsertUserProductReview(owner.id, up.id, { tolerance: 4, isPublic: true }, testDb)

    const result = await listPublicReviewsForProduct(testDb, product.slug)
    expect(result.reviews).toEqual([])
    expect(result.aggregates.total).toBe(0)
  })

  it('orders reviews newest first', async () => {
    const a = await createTestUser('first@public-rev.test')
    await setProfile(a.id, 'first-rev')
    const b = await createTestUser('second@public-rev.test')
    await setProfile(b.id, 'second-rev')
    const product = await makeProduct(a.id, 'Ordered Cream')

    const aUP = await createUserProduct(a.id, { productId: product.id, status: 'in_stock' }, testDb)
    await upsertUserProductReview(a.id, aUP.id, { tolerance: 3, isPublic: true }, testDb)

    // Small delay so created_at differs.
    await new Promise((r) => setTimeout(r, 10))

    const bUP = await createUserProduct(b.id, { productId: product.id, status: 'in_stock' }, testDb)
    await upsertUserProductReview(b.id, bUP.id, { tolerance: 4, isPublic: true }, testDb)

    const result = await listPublicReviewsForProduct(testDb, product.slug)
    expect(result.reviews.map((r) => r.reviewer.username)).toEqual(['second-rev', 'first-rev'])
  })
})
