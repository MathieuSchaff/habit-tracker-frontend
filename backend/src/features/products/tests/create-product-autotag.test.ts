// createProduct auto-tags by default (runtime/app path relies on it). The seed
// owns a dedicated, complete auto-tag phase that runs after ingredients are
// linked, so it opts out here to avoid inserting a partial tag set that then
// PK-collides with the seed phase on product_tag_links.

import { beforeEach, describe, expect, it } from 'bun:test'

import { and, eq, ne } from 'drizzle-orm'

import { productTagLinks, productTagTypes } from '../../../db/schema'
import { productTagData } from '../../../db/seed/data/tags'
import { testDb } from '../../../tests/db.test.config'
import { cleanDatabase } from '../../../tests/helpers/db-cleaner'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { createProduct } from '../service'

const RICH_INCI =
  'Aqua, Niacinamide, Retinol, Glycerin, Tocopherol, Phenoxyethanol, Hyaluronic Acid'

const autoLinks = (productId: string) =>
  testDb
    .select()
    .from(productTagLinks)
    .where(and(eq(productTagLinks.productId, productId), ne(productTagLinks.source, 'manual')))

describe('createProduct — auto-tag opt-out', () => {
  beforeEach(async () => {
    await cleanDatabase()
    await testDb.insert(productTagTypes).values(productTagData)
  })

  it('auto-tags by default', async () => {
    const user = await createTestUser()
    const product = await createProduct(
      user.id,
      {
        name: 'Auto Serum',
        brand: 'Lab',
        kind: 'serum',
        unit: 'pump',
        category: 'skincare',
        inci: RICH_INCI,
      },
      testDb
    )
    expect((await autoLinks(product.id)).length).toBeGreaterThan(0)
  })

  it('skips auto-tagging when autoTag is false', async () => {
    const user = await createTestUser()
    const product = await createProduct(
      user.id,
      {
        name: 'No Auto Serum',
        brand: 'Lab',
        kind: 'serum',
        unit: 'pump',
        category: 'skincare',
        inci: RICH_INCI,
      },
      testDb,
      { autoTag: false }
    )
    expect((await autoLinks(product.id)).length).toBe(0)
  })
})
