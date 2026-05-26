// writeTagsForProduct fans out three intake reads (brand certs, percent claims,
// tag defs). On a pooled connection each takes its own socket; on a single
// transaction connection they must NOT run concurrently — Bun's SQL pipelines
// them and misroutes the result sets, so the tag-defs read comes back empty,
// every slug fails to resolve, and the writer both inserts nothing and (via the
// unconditional DELETE) wipes the product's existing auto rows. The reconcile /
// backfill runners pass a tx (withAdminRls), so this path must stay correct.

import { beforeEach, describe, expect, it } from 'bun:test'

import { and, eq, ne } from 'drizzle-orm'

import { withAdminRls } from '../../../db/rls'
import { productTagsDefs, tagProducts } from '../../../db/schema'
import { productTagData } from '../../../db/seed/data/tags'
import { testDb } from '../../../tests/db.test.config'
import { cleanDatabase } from '../../../tests/helpers/db-cleaner'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { createProduct } from '../../products/service'
import { writeTagsForProduct } from '../write'

const RICH_INCI =
  'Aqua, Niacinamide, Retinol, Glycerin, Tocopherol, Phenoxyethanol, Hyaluronic Acid'

describe('writeTagsForProduct — transaction safety', () => {
  beforeEach(async () => {
    await cleanDatabase()
    await testDb.insert(productTagsDefs).values(productTagData)
  })

  it('writes auto rows when given a transaction, not only a pooled connection', async () => {
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

    const autoCount = async () =>
      (
        await testDb
          .select()
          .from(tagProducts)
          .where(and(eq(tagProducts.productId, product.id), ne(tagProducts.source, 'manual')))
      ).length

    // Intake tagged the product via the pooled connection.
    const before = await autoCount()
    expect(before).toBeGreaterThan(0)

    // Re-run the writer through the exact reconcile path: withAdminRls opens a
    // tx and runs a `SET LOCAL` before the writer's fan-out — the combination
    // that desyncs the pipeline.
    const { inserted } = await withAdminRls((tx) => writeTagsForProduct(product.id, tx))

    expect(inserted).toBeGreaterThan(0)
    expect(await autoCount()).toBe(before)
  })
})
