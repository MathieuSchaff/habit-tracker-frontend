/**
 * RLS regression: user_dermo_profiles_select_for_public_review must let
 * app_runtime read dermo data on the public reviews surface even when
 * profile_public=false — gated on skin flags + at least one visible public
 * review. Complements public-reviews-rls.test.ts (profiles + reviews surface).
 */
import { afterAll, beforeEach, describe, expect, it } from 'bun:test'
import { SQL } from 'bun'

import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/bun-sql'

import { profiles, userDermoProfiles } from '../../db/schema/auth/users'
import { products } from '../../db/schema/products/products'
import { userProductReviews, userProducts } from '../../db/schema/products/user-products'
import { testDb } from '../db.test.config'
import { setupDbTests } from '../db-setup'
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

setupDbTests()

describe('user_dermo_profiles RLS — public reviews surface', () => {
  it('exposes dermo row via app_runtime when skinTypesPublic=true and user has a public review (profilePublic=false)', async () => {
    const user = await createTestUser('dermo-skin-on@test.local', 'Azerty123!')
    await testDb
      .update(profiles)
      .set({ username: 'dermo-skin-on' })
      .where(eq(profiles.userId, user.id))
    // profilePublic stays false (default) — the point of the test
    await testDb.insert(userDermoProfiles).values({
      userId: user.id,
      skinTypes: ['peau-seche'],
      skinTypesPublic: true,
    })

    const [product] = await testDb
      .insert(products)
      .values({
        createdBy: user.id,
        name: 'Dermo Serum',
        brand: 'DermoBrand',
        category: 'skincare',
        kind: 'serum',
        unit: 'dropper',
        slug: 'dermo-serum-dermobrand',
      })
      .returning()
    if (!product) throw new Error()
    const [up] = await testDb
      .insert(userProducts)
      .values({ userId: user.id, productId: product.id, status: 'in_stock' })
      .returning()
    if (!up) throw new Error()
    await testDb
      .insert(userProductReviews)
      .values({ userProductId: up.id, comment: 'pub', isPublic: true })

    const rows = await appRuntimeDb.select().from(userDermoProfiles)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.userId).toBe(user.id)
  })

  it('hides dermo row via app_runtime when skinTypesPublic=false and fitzpatrickPublic=false (even with public review)', async () => {
    const user = await createTestUser('dermo-flags-off@test.local', 'Azerty123!')
    await testDb
      .update(profiles)
      .set({ username: 'dermo-flags-off' })
      .where(eq(profiles.userId, user.id))
    await testDb.insert(userDermoProfiles).values({
      userId: user.id,
      skinTypes: ['peau-grasse'],
      skinTypesPublic: false,
      fitzpatrickPublic: false,
    })

    const [product] = await testDb
      .insert(products)
      .values({
        createdBy: user.id,
        name: 'Dermo Serum 2',
        brand: 'DermoBrand',
        category: 'skincare',
        kind: 'serum',
        unit: 'dropper',
        slug: 'dermo-serum-2-dermobrand',
      })
      .returning()
    if (!product) throw new Error()
    const [up] = await testDb
      .insert(userProducts)
      .values({ userId: user.id, productId: product.id, status: 'in_stock' })
      .returning()
    if (!up) throw new Error()
    await testDb
      .insert(userProductReviews)
      .values({ userProductId: up.id, comment: 'pub', isPublic: true })

    const rows = await appRuntimeDb.select().from(userDermoProfiles)
    expect(rows).toHaveLength(0)
  })

  it('exposes dermo row via app_runtime when fitzpatrickPublic=true and skinTypesPublic=false (profilePublic=false)', async () => {
    const user = await createTestUser('dermo-fitz-on@test.local', 'Azerty123!')
    await testDb
      .update(profiles)
      .set({ username: 'dermo-fitz-on' })
      .where(eq(profiles.userId, user.id))
    await testDb.insert(userDermoProfiles).values({
      userId: user.id,
      fitzpatrickType: 3,
      skinTypesPublic: false,
      fitzpatrickPublic: true,
    })

    const [product] = await testDb
      .insert(products)
      .values({
        createdBy: user.id,
        name: 'Dermo Serum 3',
        brand: 'DermoBrand',
        category: 'skincare',
        kind: 'serum',
        unit: 'dropper',
        slug: 'dermo-serum-3-dermobrand',
      })
      .returning()
    if (!product) throw new Error()
    const [up] = await testDb
      .insert(userProducts)
      .values({ userId: user.id, productId: product.id, status: 'in_stock' })
      .returning()
    if (!up) throw new Error()
    await testDb
      .insert(userProductReviews)
      .values({ userProductId: up.id, comment: 'pub', isPublic: true })

    const rows = await appRuntimeDb.select().from(userDermoProfiles)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.userId).toBe(user.id)
  })

  it('hides dermo row when profile is force-privated by admin (even with skinTypesPublic=true and public review)', async () => {
    const user = await createTestUser('dermo-force-priv@test.local', 'Azerty123!')
    await testDb
      .update(profiles)
      .set({
        username: 'dermo-force-priv',
        forcedPrivateByAdmin: true,
      })
      .where(eq(profiles.userId, user.id))
    await testDb.insert(userDermoProfiles).values({
      userId: user.id,
      skinTypes: ['peau-normale'],
      skinTypesPublic: true,
    })

    const [product] = await testDb
      .insert(products)
      .values({
        createdBy: user.id,
        name: 'Dermo Serum 4',
        brand: 'DermoBrand',
        category: 'skincare',
        kind: 'serum',
        unit: 'dropper',
        slug: 'dermo-serum-4-dermobrand',
      })
      .returning()
    if (!product) throw new Error()
    const [up] = await testDb
      .insert(userProducts)
      .values({ userId: user.id, productId: product.id, status: 'in_stock' })
      .returning()
    if (!up) throw new Error()
    await testDb
      .insert(userProductReviews)
      .values({ userProductId: up.id, comment: 'pub', isPublic: true })

    const rows = await appRuntimeDb.select().from(userDermoProfiles)
    expect(rows).toHaveLength(0)
  })

  it('hides dermo row when the only public review is moderated hidden', async () => {
    const user = await createTestUser('dermo-mod-hidden@test.local', 'Azerty123!')
    await testDb
      .update(profiles)
      .set({ username: 'dermo-mod-hidden' })
      .where(eq(profiles.userId, user.id))
    await testDb.insert(userDermoProfiles).values({
      userId: user.id,
      skinTypes: ['peau-mixte'],
      skinTypesPublic: true,
    })

    const [product] = await testDb
      .insert(products)
      .values({
        createdBy: user.id,
        name: 'Dermo Serum 5',
        brand: 'DermoBrand',
        category: 'skincare',
        kind: 'serum',
        unit: 'dropper',
        slug: 'dermo-serum-5-dermobrand',
      })
      .returning()
    if (!product) throw new Error()
    const [up] = await testDb
      .insert(userProducts)
      .values({ userId: user.id, productId: product.id, status: 'in_stock' })
      .returning()
    if (!up) throw new Error()
    const [review] = await testDb
      .insert(userProductReviews)
      .values({
        userProductId: up.id,
        comment: 'pub',
        isPublic: true,
      })
      .returning()
    if (!review) throw new Error()

    // First confirm the row is visible with moderation_status='visible' (default)
    let rows = await appRuntimeDb.select().from(userDermoProfiles)
    expect(rows).toHaveLength(1)

    // Admin hides the review — dermo row must disappear
    await testDb
      .update(userProductReviews)
      .set({ moderationStatus: 'hidden' })
      .where(eq(userProductReviews.id, review.id))

    rows = await appRuntimeDb.select().from(userDermoProfiles)
    expect(rows).toHaveLength(0)
  })
})
