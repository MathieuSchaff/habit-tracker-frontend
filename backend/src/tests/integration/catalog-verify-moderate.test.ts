import { beforeEach, describe, expect, it } from 'bun:test'

import { eq } from 'drizzle-orm'

import { profiles } from '../../db/schema/auth/users'
import { ingredients } from '../../db/schema/ingredients/ingredients'
import { products } from '../../db/schema/products/products'
import {
  listCatalogQueue,
  moderateIngredient,
  moderateProduct,
} from '../../features/admin/moderation.service'
import { IngredientError } from '../../features/ingredients/ingredients-error'
import { createIngredient, verifyIngredient } from '../../features/ingredients/service'
import { ProductError } from '../../features/products/product-error'
import { createProduct, verifyProduct } from '../../features/products/service'
import { testDb } from '../db.test.config'
import { setupDbTests } from '../db-setup'
import { cleanDatabase } from '../helpers/db-cleaner'
import { createTestUser } from '../helpers/test-factories'

beforeEach(async () => {
  await cleanDatabase()
})

setupDbTests()

const baseProductInput = {
  name: 'VM Serum',
  brand: 'VMBrand',
  category: 'skincare',
  kind: 'serum',
  unit: 'dropper',
} as const

const baseIngredientInput = { name: 'VM Acid', type: 'skincare' } as const

async function catch_(fn: () => Promise<unknown>): Promise<unknown> {
  try {
    await fn()
  } catch (e) {
    return e
  }
  return undefined
}

describe('catalog verify — verifyProduct / verifyIngredient', () => {
  it('stamps an unverified product as verified by the actor', async () => {
    const author = await createTestUser('vm-prod-author@test.local')
    const actor = await createTestUser('vm-prod-actor@test.local')
    const product = await createProduct(author.id, 'user', baseProductInput, testDb, {
      autoTag: false,
    })

    const verified = await verifyProduct(actor.id, product.id, testDb)

    expect(verified.catalogQuality).toBe('verified')
    expect(verified.verifiedBy).toBe(actor.id)
    expect(verified.verifiedAt).not.toBeNull()
  })

  it('throws product_not_found when verifying a missing product', async () => {
    const err = await catch_(() => verifyProduct(crypto.randomUUID(), crypto.randomUUID(), testDb))
    expect(err).toBeInstanceOf(ProductError)
    expect((err as ProductError).code).toBe('product_not_found')
  })

  it('stamps an unverified ingredient as verified by the actor', async () => {
    const author = await createTestUser('vm-ing-author@test.local')
    const actor = await createTestUser('vm-ing-actor@test.local')
    const ingredient = await createIngredient(testDb, author.id, 'user', baseIngredientInput)

    const verified = await verifyIngredient(testDb, actor.id, ingredient.id)

    expect(verified.catalogQuality).toBe('verified')
    expect(verified.verifiedBy).toBe(actor.id)
    expect(verified.verifiedAt).not.toBeNull()
  })

  it('throws ingredient_not_found when verifying a missing ingredient', async () => {
    const err = await catch_(() =>
      verifyIngredient(testDb, crypto.randomUUID(), crypto.randomUUID())
    )
    expect(err).toBeInstanceOf(IngredientError)
    expect((err as IngredientError).code).toBe('ingredient_not_found')
  })
})

describe('catalog moderate — moderateProduct / moderateIngredient', () => {
  it('hides a product and returns its moderation state', async () => {
    const admin = await createTestUser('vm-mod-admin@test.local')
    const author = await createTestUser('vm-mod-author@test.local')
    const product = await createProduct(author.id, 'user', baseProductInput, testDb, {
      autoTag: false,
    })

    const result = await moderateProduct(testDb, {
      id: product.id,
      adminId: admin.id,
      body: { status: 'hidden', reason: 'spam' },
    })

    expect(result.success).toBe(true)
    if (!result.success) throw new Error('unreachable')
    expect(result.data.moderationStatus).toBe('hidden')
    expect(result.data.moderationReason).toBe('spam')
  })

  it('returns not_found when moderating a missing product', async () => {
    const admin = await createTestUser('vm-mod-missing@test.local')
    const result = await moderateProduct(testDb, {
      id: crypto.randomUUID(),
      adminId: admin.id,
      body: { status: 'hidden' },
    })
    expect(result.success).toBe(false)
    if (result.success) throw new Error('unreachable')
    expect(result.error).toBe('not_found')
  })

  it('throws 409 when unhiding a product whose key was reclaimed by a visible row (V-3)', async () => {
    const admin = await createTestUser('vm-mod-unhide@test.local')
    const author = await createTestUser('vm-mod-unhide-author@test.local')
    const first = await createProduct(author.id, 'admin', baseProductInput, testDb, {
      autoTag: false,
    })
    await testDb
      .update(products)
      .set({ moderationStatus: 'hidden' })
      .where(eq(products.id, first.id))
    // Same (name, brand) key is now free (V-3 tombstone) → a fresh visible row
    // takes it. Distinct slug because products_slug_unique is a full index.
    const clone = await createProduct(
      author.id,
      'admin',
      { ...baseProductInput, slug: 'vm-serum-clone' },
      testDb,
      { autoTag: false }
    )

    const err = await catch_(() =>
      moderateProduct(testDb, { id: first.id, adminId: admin.id, body: { status: 'visible' } })
    )

    expect(err).toBeInstanceOf(ProductError)
    expect((err as ProductError).code).toBe('product_already_exists')
    // The 409 must name the live product blocking the unhide so the admin can act.
    expect((err as ProductError).details).toMatchObject({
      id: clone.id,
      name: clone.name,
      brand: clone.brand,
      slug: clone.slug,
    })
  })

  it('hides an ingredient and returns its moderation state', async () => {
    const admin = await createTestUser('vm-mod-ing-admin@test.local')
    const author = await createTestUser('vm-mod-ing-author@test.local')
    const ingredient = await createIngredient(testDb, author.id, 'user', baseIngredientInput)

    const result = await moderateIngredient(testDb, {
      id: ingredient.id,
      adminId: admin.id,
      body: { status: 'hidden', reason: 'doublon' },
    })

    expect(result.success).toBe(true)
    if (!result.success) throw new Error('unreachable')
    expect(result.data.moderationStatus).toBe('hidden')
    expect(result.data.moderationReason).toBe('doublon')
  })

  it('throws 409 when unhiding an ingredient whose slug was reclaimed (V-3)', async () => {
    const admin = await createTestUser('vm-mod-ing-unhide@test.local')
    const author = await createTestUser('vm-mod-ing-unhide-author@test.local')
    const first = await createIngredient(testDb, author.id, 'admin', baseIngredientInput)
    await testDb
      .update(ingredients)
      .set({ moderationStatus: 'hidden' })
      .where(eq(ingredients.id, first.id))
    const clone = await createIngredient(testDb, author.id, 'admin', baseIngredientInput)

    const err = await catch_(() =>
      moderateIngredient(testDb, { id: first.id, adminId: admin.id, body: { status: 'visible' } })
    )

    expect(err).toBeInstanceOf(IngredientError)
    expect((err as IngredientError).code).toBe('ingredient_already_exists')
    expect((err as IngredientError).details).toMatchObject({
      id: clone.id,
      name: clone.name,
      slug: clone.slug,
    })
  })
})

describe('catalog queue — listCatalogQueue author', () => {
  it('resolves authorUsername from the contributor profile, null when unset', async () => {
    const named = await createTestUser('vm-queue-named@test.local')
    const anon = await createTestUser('vm-queue-anon@test.local')
    await testDb.update(profiles).set({ username: 'mathieu' }).where(eq(profiles.userId, named.id))

    const withName = await createProduct(named.id, 'user', baseProductInput, testDb, {
      autoTag: false,
    })
    const withoutName = await createProduct(
      anon.id,
      'user',
      { ...baseProductInput, name: 'VM Serum 2', slug: 'vm-serum-2' },
      testDb,
      { autoTag: false }
    )

    const { items } = await listCatalogQueue(testDb, {
      kind: 'product',
      status: 'visible',
      quality: 'unverified',
    })

    const named_ = items.find((i) => i.id === withName.id)
    const anon_ = items.find((i) => i.id === withoutName.id)
    expect(named_?.authorUsername).toBe('mathieu')
    expect(named_?.authorId).toBe(named.id)
    expect(anon_?.authorUsername).toBeNull()
    expect(anon_?.authorId).toBe(anon.id)
  })

  it('resolves authorUsername for ingredients via the same join', async () => {
    const named = await createTestUser('vm-queue-ing@test.local')
    await testDb.update(profiles).set({ username: 'chimiste' }).where(eq(profiles.userId, named.id))
    const ingredient = await createIngredient(testDb, named.id, 'user', baseIngredientInput)

    const { items } = await listCatalogQueue(testDb, {
      kind: 'ingredient',
      status: 'visible',
      quality: 'unverified',
    })

    expect(items.find((i) => i.id === ingredient.id)?.authorUsername).toBe('chimiste')
  })
})
