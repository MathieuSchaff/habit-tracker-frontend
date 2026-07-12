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
      'admin',
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

  it('keeps an explicit classification even when the name looks like a sunscreen', async () => {
    const user = await createTestUser()
    const product = await createProduct(
      user.id,
      'admin',
      {
        name: 'Relief Sun : Rice + Probiotics SPF50+ PA++++',
        brand: 'Beauty of Joseon',
        kind: 'moisturizer',
        unit: 'tube',
        category: 'skincare',
        inci: RICH_INCI,
      },
      testDb
    )
    expect(product.category).toBe('skincare')
    expect(product.kind).toBe('moisturizer')

    const links = await testDb
      .select({ slug: productTagTypes.slug, relevance: productTagLinks.relevance })
      .from(productTagLinks)
      .innerJoin(productTagTypes, eq(productTagLinks.productTagId, productTagTypes.id))
      .where(eq(productTagLinks.productId, product.id))
    expect(links).toContainEqual({ slug: 'type-hydratant', relevance: 'primary' })
    expect(links.map((l) => l.slug)).not.toContain('type-solaire')
  })

  it('skips auto-tagging when autoTag is false', async () => {
    const user = await createTestUser()
    const product = await createProduct(
      user.id,
      'admin',
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
