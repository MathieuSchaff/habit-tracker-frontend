import { beforeEach, describe, expect, it } from 'bun:test'

import { ingredients, productIngredients } from '../../../db/schema'
import { testDb } from '../../../tests/db.test.config'
import { cleanDatabase } from '../../../tests/helpers/db-cleaner'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { createProduct } from '../../products/service'
import {
  createComparison,
  deleteComparison,
  getEnrichedComparison,
  listComparisons,
  updateComparison,
} from '../service'

let user: { id: string }

async function makeProduct(name: string, brand: string) {
  return createProduct(
    user.id,
    { name, brand, kind: 'serum', unit: 'pump', category: 'skincare' },
    testDb
  )
}

describe('createComparison', () => {
  beforeEach(async () => {
    await cleanDatabase()
    user = await createTestUser()
  })

  it('creates a comparison with 2 products', async () => {
    const p1 = await makeProduct('Sérum A', 'BrandA')
    const p2 = await makeProduct('Sérum B', 'BrandB')

    const cmp = await createComparison(
      user.id,
      { name: 'Mes sérums', productIds: [p1.id, p2.id] },
      testDb
    )

    expect(cmp.id).toBeDefined()
    expect(cmp.name).toBe('Mes sérums')

    const enriched = await getEnrichedComparison(user.id, cmp.id, testDb)
    expect(enriched.products.length).toBe(2)
    expect(enriched.products.map((p) => p.id).sort()).toEqual([p1.id, p2.id].sort())
  })

  it('rejects unknown product ids', async () => {
    const real = await makeProduct('Sérum X', 'BrandX')
    const fakeId = '00000000-0000-7000-8000-000000000000'

    await expect(
      createComparison(user.id, { productIds: [real.id, fakeId] }, testDb)
    ).rejects.toMatchObject({ code: 'comparison_invalid_products' })
  })

  it("denies access to another user's comparison", async () => {
    const p1 = await makeProduct('Sérum A', 'BrandA')
    const p2 = await makeProduct('Sérum B', 'BrandB')

    const cmp = await createComparison(user.id, { productIds: [p1.id, p2.id] }, testDb)

    const otherUser = await createTestUser('intruder@toto.com')

    await expect(getEnrichedComparison(otherUser.id, cmp.id, testDb)).rejects.toMatchObject({
      code: 'comparison_not_found',
    })
  })
})

describe('updateComparison', () => {
  beforeEach(async () => {
    await cleanDatabase()
    user = await createTestUser()
  })

  it('rewrites productIds and persists order', async () => {
    const a = await makeProduct('Sérum A', 'BrandA')
    const b = await makeProduct('Sérum B', 'BrandB')
    const c = await makeProduct('Sérum C', 'BrandC')

    const cmp = await createComparison(user.id, { productIds: [a.id, b.id] }, testDb)

    await updateComparison(user.id, cmp.id, { productIds: [c.id, a.id, b.id] }, testDb)

    const enriched = await getEnrichedComparison(user.id, cmp.id, testDb)
    expect(enriched.products.map((p) => p.id)).toEqual([c.id, a.id, b.id])
  })

  it('renames without touching products', async () => {
    const p1 = await makeProduct('Sérum A', 'BrandA')
    const p2 = await makeProduct('Sérum B', 'BrandB')

    const cmp = await createComparison(
      user.id,
      { name: 'Original', productIds: [p1.id, p2.id] },
      testDb
    )

    await updateComparison(user.id, cmp.id, { name: 'Renamed' }, testDb)

    const enriched = await getEnrichedComparison(user.id, cmp.id, testDb)
    expect(enriched.name).toBe('Renamed')
    expect(enriched.products.length).toBe(2)
  })
})

describe('listComparisons', () => {
  beforeEach(async () => {
    await cleanDatabase()
    user = await createTestUser()
  })

  it('lists user comparisons with product count', async () => {
    const p1 = await makeProduct('Sérum A', 'BrandA')
    const p2 = await makeProduct('Sérum B', 'BrandB')

    await createComparison(user.id, { name: 'first', productIds: [p1.id, p2.id] }, testDb)

    const list = await listComparisons(user.id, testDb)
    expect(list.length).toBe(1)
    expect(list[0]?.name).toBe('first')
    expect(list[0]?.productCount).toBe(2)
  })
})

describe('deleteComparison', () => {
  beforeEach(async () => {
    await cleanDatabase()
    user = await createTestUser()
  })

  it('removes a comparison and its items', async () => {
    const p1 = await makeProduct('Sérum A', 'BrandA')
    const p2 = await makeProduct('Sérum B', 'BrandB')

    const cmp = await createComparison(user.id, { productIds: [p1.id, p2.id] }, testDb)

    await deleteComparison(user.id, cmp.id, testDb)

    await expect(getEnrichedComparison(user.id, cmp.id, testDb)).rejects.toMatchObject({
      code: 'comparison_not_found',
    })
  })

  it('denies a different user from deleting', async () => {
    const a = await makeProduct('Sérum A', 'BrandA')
    const b = await makeProduct('Sérum B', 'BrandB')

    const cmp = await createComparison(user.id, { productIds: [a.id, b.id] }, testDb)

    const otherUser = await createTestUser('intruder@test.com')

    await expect(deleteComparison(otherUser.id, cmp.id, testDb)).rejects.toMatchObject({
      code: 'comparison_not_found',
    })
  })
})

describe('enrichment', () => {
  beforeEach(async () => {
    await cleanDatabase()
    user = await createTestUser()
  })

  it('flags niacinamide as active', async () => {
    const p1 = await makeProduct('Sérum A', 'BrandA')
    const p2 = await makeProduct('Sérum B', 'BrandB')

    const [ingredient] = await testDb
      .insert(ingredients)
      .values({
        createdBy: user.id,
        name: 'Niacinamide',
        slug: 'niacinamide',
        type: 'skincare',
      })
      .returning()
    if (!ingredient) throw new Error('ingredient insert failed')

    await testDb.insert(productIngredients).values({
      productId: p1.id,
      ingredientId: ingredient.id,
    })

    const cmp = await createComparison(user.id, { productIds: [p1.id, p2.id] }, testDb)

    const enriched = await getEnrichedComparison(user.id, cmp.id, testDb)
    const first = enriched.products.find((p) => p.id === p1.id)
    expect(first?.ingredients[0]?.signals).toContain('active')
  })

  it('computes price per ml when total amount is set', async () => {
    const a = await createProduct(
      user.id,
      {
        name: 'Sérum A',
        brand: 'BrandA',
        kind: 'serum',
        unit: 'pump',
        category: 'skincare',
        priceCents: 1000,
        totalAmount: 50,
        amountUnit: 'ml',
      },
      testDb
    )
    const b = await makeProduct('Sérum B', 'BrandB')

    const cmp = await createComparison(user.id, { productIds: [a.id, b.id] }, testDb)

    const enriched = await getEnrichedComparison(user.id, cmp.id, testDb)
    const ap = enriched.products.find((p) => p.id === a.id)
    const bp = enriched.products.find((p) => p.id === b.id)
    expect(ap?.pricePer).toEqual({ unit: 'ml', cents: 20 })
    expect(bp?.pricePer).toBeNull()
  })
})
