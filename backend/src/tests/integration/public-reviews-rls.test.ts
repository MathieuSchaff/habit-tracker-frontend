/**
 * Regression test: user_product_reviews_select_public +
 * profiles_select_for_public_review must let an anonymous app_runtime caller
 * see only opted-in reviews and the matching reviewer pseudonym, never the
 * private ones. Service-level tests bypass RLS (testDb = owner pool); this
 * file binds to the real app_runtime role so the policies are exercised.
 */
import { afterAll, beforeEach, describe, expect, it } from 'bun:test'
import { SQL } from 'bun'

import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/bun-sql'

import { profiles } from '../../db/schema/auth/users'
import { products } from '../../db/schema/products/products'
import { userProductReviews, userProducts } from '../../db/schema/products/user-products'
import { testDb } from '../db.test.config'
import { cleanDatabase } from '../helpers/db-cleaner'
import { createTestUser } from '../helpers/test-factories'

const APP_DATABASE_URL = process.env.APP_DATABASE_URL
if (!APP_DATABASE_URL) throw new Error('APP_DATABASE_URL not set')

const appRuntimePool = new SQL(APP_DATABASE_URL)
const appRuntimeDb = drizzle(appRuntimePool, {
  schema: await import('../../db/schema'),
})

afterAll(async () => {
  await appRuntimePool.close()
})

beforeEach(async () => {
  await cleanDatabase()
})

describe('public reviews RLS — anonymous app_runtime', () => {
  it('exposes only is_public=true reviews and the reviewer pseudonym', async () => {
    const alice = await createTestUser('alice-rev@test.local', 'Azerty123!')
    const bob = await createTestUser('bob-rev@test.local', 'Azerty123!')
    const carol = await createTestUser('carol-rev@test.local', 'Azerty123!')

    // alice = public profile, no review at all.
    await testDb
      .update(profiles)
      .set({ username: 'alice-pub', profilePublic: true })
      .where(eq(profiles.userId, alice.id))
    // bob = private profile + a public review (tests profiles_select_for_public_review).
    await testDb
      .update(profiles)
      .set({ username: 'bob-priv-pub-rev' })
      .where(eq(profiles.userId, bob.id))
    // carol = private profile + a private-only review (must stay invisible).
    await testDb
      .update(profiles)
      .set({ username: 'carol-priv' })
      .where(eq(profiles.userId, carol.id))

    const [product] = await testDb
      .insert(products)
      .values({
        createdBy: alice.id,
        name: 'Test Serum',
        brand: 'TestBrand',
        category: 'skincare',
        kind: 'serum',
        unit: 'dropper',
        slug: 'test-serum-testbrand',
      })
      .returning()
    if (!product) throw new Error('product seed failed')

    const [bobUp] = await testDb
      .insert(userProducts)
      .values({ userId: bob.id, productId: product.id, status: 'in_stock' })
      .returning()
    const [carolUp] = await testDb
      .insert(userProducts)
      .values({ userId: carol.id, productId: product.id, status: 'in_stock' })
      .returning()
    if (!bobUp || !carolUp) throw new Error('user_products seed failed')

    await testDb.insert(userProductReviews).values([
      { userProductId: bobUp.id, tolerance: 4, comment: 'bob public', isPublic: true },
      { userProductId: carolUp.id, tolerance: 2, comment: 'carol private', isPublic: false },
    ])

    const visibleReviews = await appRuntimeDb.select().from(userProductReviews)
    expect(visibleReviews).toHaveLength(1)
    expect(visibleReviews[0]?.userProductId).toBe(bobUp.id)
    expect(visibleReviews[0]?.comment).toBe('bob public')

    const visibleProfiles = await appRuntimeDb.select().from(profiles)
    const visibleUserIds = visibleProfiles.map((p) => p.userId).sort()
    expect(visibleUserIds).toEqual([alice.id, bob.id].sort())
  })

  it('hides reviewer profile once their last public review flips private', async () => {
    const bob = await createTestUser('bob-flip@test.local', 'Azerty123!')

    await testDb.update(profiles).set({ username: 'bob-flip' }).where(eq(profiles.userId, bob.id))

    const [product] = await testDb
      .insert(products)
      .values({
        createdBy: bob.id,
        name: 'Flip Serum',
        brand: 'FlipBrand',
        category: 'skincare',
        kind: 'serum',
        unit: 'dropper',
        slug: 'flip-serum-flipbrand',
      })
      .returning()
    if (!product) throw new Error('product seed failed')

    const [up] = await testDb
      .insert(userProducts)
      .values({ userId: bob.id, productId: product.id, status: 'in_stock' })
      .returning()
    if (!up) throw new Error('user_product seed failed')

    const [review] = await testDb
      .insert(userProductReviews)
      .values({ userProductId: up.id, tolerance: 5, isPublic: true })
      .returning()
    if (!review) throw new Error('review seed failed')

    let visible = await appRuntimeDb.select().from(profiles)
    expect(visible.map((p) => p.userId)).toEqual([bob.id])

    await testDb
      .update(userProductReviews)
      .set({ isPublic: false })
      .where(eq(userProductReviews.id, review.id))

    visible = await appRuntimeDb.select().from(profiles)
    expect(visible).toHaveLength(0)
  })

  it('cannot SELECT users.password_hash (column GRANT excluded by 0038)', async () => {
    await createTestUser('hash-probe@test.local', 'Azerty123!')

    const pool = new SQL(APP_DATABASE_URL)
    let threw = false
    try {
      await pool`SELECT password_hash FROM users LIMIT 1`
    } catch (e: unknown) {
      threw = true
      expect((e as Error).message).toMatch(/permission denied/i)
    } finally {
      await pool.close()
    }
    expect(threw).toBe(true)
  })
})
