// Cross-pins the reconcile dry-run against the apply path: diffReconcileProduct
// (pure prediction) and writeTagsForProduct (SQL DELETE non-manual + INSERT
// onConflictDoNothing) are two encodings of the same full-sync policy with no
// shared code; without this test they can drift silently (ADR-0016).
// The want/stored/manual maps are built with the same queries reconcile.ts uses.

import { beforeEach, describe, expect, it } from 'bun:test'

import { and, eq } from 'drizzle-orm'

import { products, productTagLinks, productTagTypes } from '../../../db/schema'
import { productTagData } from '../../../db/seed/data/tags'
import { testDb } from '../../../tests/db.test.config'
import { cleanDatabase } from '../../../tests/helpers/db-cleaner'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { loadAutoTagFetchBundle } from '../lib/fetch-auto-tag-bundle'
import { computeTagRowsForProduct } from '../lib/orchestrator-input'
import { diffReconcileProduct } from '../runners/backfill/reconcile-diff'
import { writeTagsForProduct } from '../write'
import { createAutoTagProduct } from './db-helpers'

async function fetchLinks(productId: string) {
  return testDb
    .select({
      productTagId: productTagLinks.productTagId,
      relevance: productTagLinks.relevance,
      source: productTagLinks.source,
    })
    .from(productTagLinks)
    .where(eq(productTagLinks.productId, productId))
}

describe('reconcile dry-run ↔ apply parity', () => {
  beforeEach(async () => {
    await cleanDatabase()
    await testDb.insert(productTagTypes).values(productTagData)
  })

  it('diffReconcileProduct predicts exactly what writeTagsForProduct persists', async () => {
    const user = await createTestUser()
    const created = await createAutoTagProduct(user.id, {
      name: 'Sérum Parité',
      inci: 'Aqua, Niacinamide, Glycerin, Squalane, Butyrospermum Parkii Butter',
    })

    // Intake already wrote the auto rows; grab the orchestrator's current truth.
    const [productRow] = await testDb
      .select()
      .from(products)
      .where(eq(products.id, created.id))
      .limit(1)
    if (!productRow) throw new Error('product fixture missing')
    const bundle = await loadAutoTagFetchBundle([created.id])
    const { rows: wantRows } = computeTagRowsForProduct(productRow, bundle)
    const want = new Map(wantRows.map((r) => [r.tagId, r.relevance]))
    // The scenario below needs 3 distinct wanted tags to mutate independently.
    expect(want.size).toBeGreaterThanOrEqual(3)
    const [tagA, tagB, tagC] = [...want.keys()]
    const staleTagId = productTagData
      .map((t) => t.slug)
      .filter((slug) => !wantRows.some((r) => r.tagSlug === slug))
      .map((slug) => bundle.tagSlugToInfo.get(slug)?.id)
      .find((id): id is string => !!id)
    if (!staleTagId) throw new Error('no non-emitted tag available for the stale fixture')

    // Disorder the stored state:
    // 1. stale non-manual row the orchestrator no longer emits → delete expected
    await testDb.insert(productTagLinks).values({
      productId: created.id,
      productTagId: staleTagId,
      relevance: 'secondary',
      source: 'formula',
    })
    // 2. drop a wanted auto row → insert expected
    await testDb
      .delete(productTagLinks)
      .where(and(eq(productTagLinks.productId, created.id), eq(productTagLinks.productTagId, tagA)))
    // 3. flip a wanted row's relevance → relevance change expected
    const flipped = want.get(tagB) === 'avoid' ? 'secondary' : 'avoid'
    await testDb
      .update(productTagLinks)
      .set({ relevance: flipped })
      .where(and(eq(productTagLinks.productId, created.id), eq(productTagLinks.productTagId, tagB)))
    // 4. manual row holding a wanted PK → manual-shadowed insert expected
    await testDb
      .delete(productTagLinks)
      .where(and(eq(productTagLinks.productId, created.id), eq(productTagLinks.productTagId, tagC)))
    await testDb.insert(productTagLinks).values({
      productId: created.id,
      productTagId: tagC,
      relevance: 'secondary',
      source: 'manual',
    })

    // State built with the same shapes reconcile.ts feeds the diff.
    const links = await fetchLinks(created.id)
    const stored = new Map(
      links.filter((l) => l.source !== 'manual').map((l) => [l.productTagId, l.relevance])
    )
    const manual = new Set(links.filter((l) => l.source === 'manual').map((l) => l.productTagId))

    const diff = diffReconcileProduct({ want, stored, manual })

    expect(diff.inserts).toEqual([tagA])
    expect(diff.manualShadowed).toEqual([tagC])
    expect(diff.deletes).toEqual([staleTagId])
    expect(diff.relChanges).toEqual([{ tagId: tagB, from: flipped, to: want.get(tagB) ?? 'avoid' }])

    await writeTagsForProduct(created.id, testDb)

    // The applied state must match the prediction applied to the initial state.
    const after = await fetchLinks(created.id)
    const afterAuto = new Map(
      after.filter((l) => l.source !== 'manual').map((l) => [l.productTagId, l.relevance])
    )
    const afterManual = after.filter((l) => l.source === 'manual')

    // Every wanted tag persisted except the manual-shadowed PK; nothing else.
    const expectedAuto = new Map([...want].filter(([tagId]) => tagId !== tagC))
    expect(afterAuto).toEqual(expectedAuto)
    expect(afterAuto.has(staleTagId)).toBe(false)
    expect(afterAuto.get(tagA)).toBe(want.get(tagA))
    expect(afterAuto.get(tagB)).toBe(want.get(tagB))
    // The manual row survives untouched, still owning its PK.
    expect(afterManual).toEqual([{ productTagId: tagC, relevance: 'secondary', source: 'manual' }])
  })
})
