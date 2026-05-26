// Pins the manual×auto overlap: when a source='manual' row already holds
// (productId, productTagId) and the orchestrator re-emits that slug, the
// scoped DELETE spares the manual row and the INSERT onConflictDoNothing
// yields — human tag wins, no competing auto row. Complements
// auto-tag-stale-cleanup, which covers a manual slug the orchestrator never emits.

import { beforeEach, describe, expect, it } from 'bun:test'

import { and, eq, ne } from 'drizzle-orm'

import { productTagsDefs, tagProducts } from '../../../db/schema'
import { productTagData } from '../../../db/seed/data/tags'
import { testDb } from '../../../tests/db.test.config'
import { cleanDatabase } from '../../../tests/helpers/db-cleaner'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { addTagToProduct, removeTagFromProduct } from '../../product-tags/service'
import { createProduct } from '../../products/service'
import { writeTagsForProduct } from '../write'

// SPF in the name makes formula/protection.ts emit `protection` (source
// 'formula', relevance 'secondary'); niacinamide guarantees a second,
// unrelated auto row so the "batch survives the collision" check has teeth.
const SPF_NAME = 'Daily Fluid SPF 50'
const INCI = 'Aqua, Niacinamide, Glycerin, Phenoxyethanol'

describe('writeTagsForProduct — manual row shadows a re-emitted auto slug', () => {
  beforeEach(async () => {
    await cleanDatabase()
    await testDb.insert(productTagsDefs).values(productTagData)
  })

  it('keeps the manual row and skips the competing auto insert on overlap', async () => {
    const user = await createTestUser()

    const [protectionDef] = await testDb
      .select()
      .from(productTagsDefs)
      .where(eq(productTagsDefs.slug, 'protection'))
      .limit(1)
    if (!protectionDef) throw new Error('seed productTagData missing "protection" slug')

    // Intake auto-tags from the SPF name. A landed non-manual protection row
    // proves the orchestrator emits the slug AND it clears the validTagTypes
    // filter — so the later overlap genuinely exercises the PK conflict.
    const product = await createProduct(
      user.id,
      {
        name: SPF_NAME,
        brand: 'Lab',
        kind: 'serum',
        unit: 'pump',
        category: 'skincare',
        inci: INCI,
      },
      testDb
    )
    const [autoProtection] = await testDb
      .select()
      .from(tagProducts)
      .where(
        and(eq(tagProducts.productId, product.id), eq(tagProducts.productTagId, protectionDef.id))
      )
    expect(autoProtection).toBeDefined()
    expect(autoProtection.source).not.toBe('manual')

    // Swap the auto row for a manual one with a distinct relevance.
    await removeTagFromProduct(testDb, product.id, protectionDef.id)
    await addTagToProduct(testDb, product.id, protectionDef.id, 'primary')
    const [manualBefore] = await testDb
      .select()
      .from(tagProducts)
      .where(
        and(eq(tagProducts.productId, product.id), eq(tagProducts.productTagId, protectionDef.id))
      )
    expect(manualBefore.source).toBe('manual')

    // Retag: orchestrator still wants protection (SPF name unchanged), but the
    // manual PK collision must leave the human row untouched.
    await writeTagsForProduct(product.id, testDb)

    const protectionRows = await testDb
      .select()
      .from(tagProducts)
      .where(
        and(eq(tagProducts.productId, product.id), eq(tagProducts.productTagId, protectionDef.id))
      )
    expect(protectionRows).toHaveLength(1)
    expect(protectionRows[0].source).toBe('manual')
    expect(protectionRows[0].relevance).toBe('primary')

    // The collision must not abort the batch: the orchestrator's other auto
    // rows are still written around the shadowed slug.
    const autoRows = await testDb
      .select()
      .from(tagProducts)
      .where(and(eq(tagProducts.productId, product.id), ne(tagProducts.source, 'manual')))
    expect(autoRows.length).toBeGreaterThan(0)
  })
})
