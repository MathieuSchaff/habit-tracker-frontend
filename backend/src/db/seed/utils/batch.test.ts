// seedBatch runs its items inside the seed's single outer transaction (one
// connection). Fanning them out concurrently makes each createProduct open a
// nested tx (a SAVEPOINT) on that shared connection; Bun's SQL pipelines the
// statements and Drizzle's nested-tx counter races, so a RELEASE kills another
// item's savepoint -> `savepoint "sN" does not exist` and the rest cascade.
// withAdminRls reproduces the exact outer-tx + SET LOCAL admin combo the seed
// uses (see seed-core).

import { beforeEach, describe, expect, it } from 'bun:test'

import { createProduct } from '../../../features/products/service'
import { testDb } from '../../../tests/db.test.config'
import { cleanDatabase } from '../../../tests/helpers/db-cleaner'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { withAdminRls } from '../../rls'
import { productTagTypes } from '../../schema'
import { productTagData } from '../data/tags'
import { seedBatch } from './batch'

const RICH_INCI =
  'Aqua, Niacinamide, Retinol, Glycerin, Tocopherol, Phenoxyethanol, Hyaluronic Acid'

describe('seedBatch — transaction safety', () => {
  beforeEach(async () => {
    await cleanDatabase()
    await testDb.insert(productTagTypes).values(productTagData)
  })

  it('creates every item when batched under a shared transaction', async () => {
    const user = await createTestUser()
    const items = Array.from({ length: 8 }, (_, i) => ({
      name: `Serum ${i}`,
      brand: 'Lab',
      kind: 'serum' as const,
      unit: 'pump' as const,
      category: 'skincare' as const,
      inci: RICH_INCI,
    }))

    const result = await withAdminRls((tx) =>
      seedBatch(
        'produits',
        items,
        (p) => createProduct(user.id, 'admin', p, tx),
        (p) => p.name
      )
    )

    expect(result.failed).toEqual([])
    expect(result.success).toBe(items.length)
  })
})
