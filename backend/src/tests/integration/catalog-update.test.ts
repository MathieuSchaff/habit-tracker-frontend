import { afterAll, beforeEach, describe, expect, it } from 'bun:test'
import { SQL } from 'bun'

import { eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/bun-sql'

import { ingredients } from '../../db/schema/ingredients/ingredients'
import { products } from '../../db/schema/products/products'
import { IngredientError } from '../../features/ingredients/ingredients-error'
import { createIngredient, updateIngredient } from '../../features/ingredients/service'
import { ProductError } from '../../features/products/product-error'
import { createProduct, updateProduct } from '../../features/products/service'
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

// Run a service call inside an RLS-scoped tx, mirroring withRlsContext: the
// app_runtime pool is subject to RLS, so a 0-row UPDATE only happens when the
// policy actually denies the write — the real path the disambiguation guards.
function withRls<T>(role: string, userId: string, fn: (tx: typeof appRuntimeDb) => Promise<T>) {
  return appRuntimeDb.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.user_id', ${userId}, true)`)
    await tx.execute(sql`SELECT set_config('app.role', ${role}, true)`)
    return fn(tx as unknown as typeof appRuntimeDb)
  })
}

const baseProductInput = {
  name: 'Update Serum',
  brand: 'UpdateBrand',
  category: 'skincare',
  kind: 'serum',
  unit: 'dropper',
} as const

async function catch_(fn: () => Promise<unknown>): Promise<unknown> {
  try {
    await fn()
  } catch (e) {
    return e
  }
  return undefined
}

const baseIngredientInput = { name: 'Update Acid', type: 'skincare' } as const

describe('catalog update — updateIngredient slug immutability (C-4)', () => {
  it('does not change the slug when the name changes', async () => {
    const user = await createTestUser('ing-immutable@test.local')
    const created = await createIngredient(testDb, user.id, 'contributor', baseIngredientInput)

    const updated = await updateIngredient(testDb, user.id, created.id, { name: 'Renamed Acid' })

    expect(updated.name).toBe('Renamed Acid')
    expect(updated.slug).toBe(created.slug)
  })

  it('rejects a slug field in the update payload (no longer mutable)', async () => {
    const user = await createTestUser('ing-slug-reject@test.local')
    const created = await createIngredient(testDb, user.id, 'contributor', baseIngredientInput)

    const err = await catch_(() =>
      updateIngredient(testDb, user.id, created.id, { slug: 'forced-slug' } as never)
    )

    expect(err).toBeInstanceOf(Error)
    expect((err as IngredientError).code).not.toBe('ingredient_not_found')
  })
})

describe('catalog update — updateIngredient 0-row disambiguation (CQ-2)', () => {
  it('★ creator editing an ingredient that became verified gets 403, not a 500', async () => {
    const user = await createTestUser('ing-upd-verified@test.local')
    const created = await createIngredient(testDb, user.id, 'user', baseIngredientInput)
    await testDb
      .update(ingredients)
      .set({ catalogQuality: 'verified' })
      .where(eq(ingredients.id, created.id))

    const err = await catch_(() =>
      withRls('user', user.id, (tx) =>
        updateIngredient(tx, user.id, created.id, { name: 'Renamed Acid' })
      )
    )

    expect(err).toBeInstanceOf(IngredientError)
    expect((err as IngredientError).code).toBe('unauthorized_access')
  })

  it('keeps the optimistic-lock 409 ahead of the 403 when expectedUpdatedAt is set', async () => {
    const user = await createTestUser('ing-upd-occ@test.local')
    const created = await createIngredient(testDb, user.id, 'user', baseIngredientInput)
    await testDb
      .update(ingredients)
      .set({ catalogQuality: 'verified' })
      .where(eq(ingredients.id, created.id))

    const err = await catch_(() =>
      withRls('user', user.id, (tx) =>
        updateIngredient(
          tx,
          user.id,
          created.id,
          { name: 'Renamed Acid' },
          undefined,
          created.updatedAt
        )
      )
    )

    expect(err).toBeInstanceOf(IngredientError)
    expect((err as IngredientError).code).toBe('ingredient_update_conflict')
  })

  it('returns 403 when editing another user’s visible ingredient', async () => {
    const owner = await createTestUser('ing-upd-owner@test.local')
    const other = await createTestUser('ing-upd-other@test.local')
    const created = await createIngredient(testDb, owner.id, 'user', baseIngredientInput)

    const err = await catch_(() =>
      withRls('user', other.id, (tx) =>
        updateIngredient(tx, other.id, created.id, { name: 'Hijacked Acid' })
      )
    )

    expect(err).toBeInstanceOf(IngredientError)
    expect((err as IngredientError).code).toBe('unauthorized_access')
  })
})

describe('catalog update — updateProduct dedup on rename (C-4)', () => {
  it('translates a unique-key collision on rename into 409, never a raw 500', async () => {
    const user = await createTestUser('upd-dedup@test.local')
    await createProduct(
      user.id,
      'admin',
      {
        name: 'Existing Serum',
        brand: 'DedupBrand',
        category: 'skincare',
        kind: 'serum',
        unit: 'dropper',
      },
      testDb,
      { autoTag: false }
    )
    const movable = await createProduct(user.id, 'admin', baseProductInput, testDb, {
      autoTag: false,
    })

    const err = await catch_(() =>
      updateProduct(
        user.id,
        movable.id,
        { name: 'Existing Serum', brand: 'DedupBrand' },
        undefined,
        testDb
      )
    )

    expect(err).toBeInstanceOf(ProductError)
    expect((err as ProductError).code).toBe('product_already_exists')
  })
})

describe('catalog update — updateProduct field-strip (V-2)', () => {
  it('ignores attempts to flip quality / moderation / verify stamps', async () => {
    const user = await createTestUser('upd-strip@test.local')
    const product = await createProduct(user.id, 'user', baseProductInput, testDb, {
      autoTag: false,
    })

    // testDb bypasses RLS, so only the service field-strip can stop the flip.
    const updated = await updateProduct(
      user.id,
      product.id,
      {
        name: 'Stripped Serum',
        catalogQuality: 'verified',
        moderationStatus: 'hidden',
        verifiedBy: user.id,
        verifiedAt: new Date().toISOString(),
      } as never,
      undefined,
      testDb
    )

    expect(updated.name).toBe('Stripped Serum')
    expect(updated.catalogQuality).toBe('unverified')
    expect(updated.moderationStatus).toBe('visible')
    expect(updated.verifiedBy).toBeNull()
    expect(updated.verifiedAt).toBeNull()
  })
})

describe('catalog update — updateProduct 0-row disambiguation (CQ-2)', () => {
  it('★ creator editing a row that became verified gets 403, not a silent 404', async () => {
    const user = await createTestUser('upd-verified@test.local')
    const product = await createProduct(user.id, 'user', baseProductInput, testDb, {
      autoTag: false,
    })
    await testDb
      .update(products)
      .set({ catalogQuality: 'verified' })
      .where(eq(products.id, product.id))

    const err = await catch_(() =>
      withRls('user', user.id, (tx) =>
        updateProduct(user.id, product.id, { name: 'Renamed Serum' }, undefined, tx)
      )
    )

    expect(err).toBeInstanceOf(ProductError)
    expect((err as ProductError).code).toBe('unauthorized_access')
  })

  it('returns 404 when the target product does not exist', async () => {
    const user = await createTestUser('upd-absent@test.local')
    const fakeId = crypto.randomUUID()

    const err = await catch_(() =>
      withRls('user', user.id, (tx) =>
        updateProduct(user.id, fakeId, { name: 'Ghost Serum' }, undefined, tx)
      )
    )

    expect(err).toBeInstanceOf(ProductError)
    expect((err as ProductError).code).toBe('product_not_found')
  })

  it('returns 403 when editing another user’s visible row', async () => {
    const owner = await createTestUser('upd-owner@test.local')
    const other = await createTestUser('upd-other@test.local')
    const product = await createProduct(owner.id, 'user', baseProductInput, testDb, {
      autoTag: false,
    })

    const err = await catch_(() =>
      withRls('user', other.id, (tx) =>
        updateProduct(other.id, product.id, { name: 'Hijacked Serum' }, undefined, tx)
      )
    )

    expect(err).toBeInstanceOf(ProductError)
    expect((err as ProductError).code).toBe('unauthorized_access')
  })
})
