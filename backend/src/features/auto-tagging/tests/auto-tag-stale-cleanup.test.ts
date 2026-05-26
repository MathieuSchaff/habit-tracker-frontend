// Locks the bug 1 fix: writeTagsForProduct must DELETE stale auto rows on
// retag, but never wipe rows whose source = 'manual'. The DELETE-before-INSERT
// in write.ts is wrapped in a transaction so partial state is never visible.

import { beforeEach, describe, expect, it } from 'bun:test'

import { and, eq, ne } from 'drizzle-orm'

import { productTagTypes, productTagLinks } from '../../../db/schema'
import { productTagData } from '../../../db/seed/data/tags'
import { testDb } from '../../../tests/db.test.config'
import { cleanDatabase } from '../../../tests/helpers/db-cleaner'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { addTagToProduct } from '../../product-tags/service'
import { createProduct, updateProduct } from '../../products/service'

const RICH_INCI =
  'Aqua, Niacinamide, Retinol, Glycerin, Tocopherol, Phenoxyethanol, Hyaluronic Acid'

describe('writeTagsForProduct — stale auto-tag cleanup on INCI change', () => {
  beforeEach(async () => {
    await cleanDatabase()
    await testDb.insert(productTagTypes).values(productTagData)
  })

  it('drops INCI-derived auto rows when INCI is emptied; preserves manual rows', async () => {
    const user = await createTestUser()

    const product = await createProduct(
      user.id,
      {
        name: 'Test Serum',
        brand: 'Lab',
        kind: 'serum',
        unit: 'pump',
        category: 'skincare',
        inci: RICH_INCI,
      },
      testDb
    )

    const before = await testDb
      .select()
      .from(productTagLinks)
      .where(eq(productTagLinks.productId, product.id))

    // Sanity: at least one INCI-derived row (algo-derm / actif-class / formula
    // / cross-signal / percent-claim / interaction). Without this the assertion
    // below would pass trivially.
    const inciSources = new Set([
      'algo-derm',
      'actif-class',
      'formula',
      'cross-signal',
      'interaction',
      'percent-claim',
    ])
    const inciDerivedBefore = before.filter((r) => inciSources.has(r.source))
    expect(inciDerivedBefore.length).toBeGreaterThan(0)

    // Inject a manual tag (the orchestrator must never have emitted this slug
    // for this product, otherwise the test confuses "preserved manual" with
    // "re-emitted auto"). `eczema` is a concern slug not derivable from this
    // INCI in the test fixture.
    // `keratose-pilaire` is emitted by `formula/keratose-pilaire.ts` only when
    // INCI contains urea or ammonium-lactate + lactic. RICH_INCI has neither,
    // so the orchestrator never emits it — safe marker for "row the
    // orchestrator does not own".
    const [manualDef] = await testDb
      .select()
      .from(productTagTypes)
      .where(eq(productTagTypes.slug, 'keratose-pilaire'))
      .limit(1)
    if (!manualDef) throw new Error('seed productTagData missing "keratose-pilaire" slug')
    await addTagToProduct(testDb, product.id, manualDef.id, 'secondary')

    // Confirm the manual row landed with source = 'manual'.
    const [manualRow] = await testDb
      .select()
      .from(productTagLinks)
      .where(and(eq(productTagLinks.productId, product.id), eq(productTagLinks.productTagId, manualDef.id)))
    expect(manualRow.source).toBe('manual')

    // Trigger retag by emptying the INCI. updateProduct's trigger now fires
    // on any AUTOTAG_INPUT_FIELDS change; INCI is in that set.
    await updateProduct(user.id, product.id, { inci: '' }, undefined, testDb)

    const after = await testDb
      .select()
      .from(productTagLinks)
      .where(eq(productTagLinks.productId, product.id))

    // INCI-derived auto rows are gone — that's the bug-1 fix.
    const inciDerivedAfter = after.filter((r) => inciSources.has(r.source))
    expect(inciDerivedAfter).toHaveLength(0)

    // Manual row survived.
    const manualAfter = await testDb
      .select()
      .from(productTagLinks)
      .where(and(eq(productTagLinks.productId, product.id), eq(productTagLinks.productTagId, manualDef.id)))
    expect(manualAfter).toHaveLength(1)
    expect(manualAfter[0].source).toBe('manual')
  })

  it('swaps auto rows when INCI changes; manual row survives untouched', async () => {
    const user = await createTestUser()

    const product = await createProduct(
      user.id,
      {
        name: 'Test Cream',
        brand: 'Lab',
        kind: 'moisturizer',
        unit: 'tube',
        category: 'skincare',
        inci: RICH_INCI,
      },
      testDb
    )

    const beforeAutoIds = new Set(
      (
        await testDb
          .select({ pTagId: productTagLinks.productTagId })
          .from(productTagLinks)
          .where(and(eq(productTagLinks.productId, product.id), ne(productTagLinks.source, 'manual')))
      ).map((r) => r.pTagId)
    )
    expect(beforeAutoIds.size).toBeGreaterThan(0)

    const [manualDef] = await testDb
      .select()
      .from(productTagTypes)
      .where(eq(productTagTypes.slug, 'keratose-pilaire'))
      .limit(1)
    if (!manualDef) throw new Error('seed productTagData missing "keratose-pilaire" slug')
    await addTagToProduct(testDb, product.id, manualDef.id, 'secondary')

    // Different INCI with zero overlap on RICH_INCI's actives (no Retinol,
    // Niacinamide, Hyaluronic Acid). The orchestrator's emission set must
    // differ — proving DELETE+INSERT really diffs, not just merges.
    await updateProduct(
      user.id,
      product.id,
      { inci: 'Aqua, Glycerin, Squalane, Bisabolol, Allantoin, Phenoxyethanol' },
      undefined,
      testDb
    )

    const afterAutoIds = new Set(
      (
        await testDb
          .select({ pTagId: productTagLinks.productTagId })
          .from(productTagLinks)
          .where(and(eq(productTagLinks.productId, product.id), ne(productTagLinks.source, 'manual')))
      ).map((r) => r.pTagId)
    )
    const dropped = [...beforeAutoIds].filter((id) => !afterAutoIds.has(id))
    expect(dropped.length).toBeGreaterThan(0)

    const [manualAfter] = await testDb
      .select()
      .from(productTagLinks)
      .where(and(eq(productTagLinks.productId, product.id), eq(productTagLinks.productTagId, manualDef.id)))
    expect(manualAfter).toBeDefined()
    expect(manualAfter.source).toBe('manual')
  })
})
