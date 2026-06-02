// Writer-level guard for eczema-atopie withholding. partitionEczemaReview runs
// inside writeTagsForProduct (the intake path), not inside detectAllAutoTags, so
// the pure unit test in formula.test.ts does not prove the live wiring applies it.
// This pins it: a product whose description names atopy under a contraindication
// must not persist the tag; a plainly atopy-positioned product must.

import { beforeEach, describe, expect, it } from 'bun:test'

import { SKINCARE_PRODUCT_TAG_SLUGS } from '@aurore/shared'

import { and, eq } from 'drizzle-orm'

import { productTagLinks, productTagTypes } from '../../../db/schema'
import { productTagData } from '../../../db/seed/data/tags'
import { testDb } from '../../../tests/db.test.config'
import { cleanDatabase } from '../../../tests/helpers/db-cleaner'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { createProduct } from '../../products/service'

const ATOPIE_SLUG = SKINCARE_PRODUCT_TAG_SLUGS.ECZEMA_ATOPIE

async function eczemaRowCount(productId: string): Promise<number> {
  const [def] = await testDb
    .select()
    .from(productTagTypes)
    .where(eq(productTagTypes.slug, ATOPIE_SLUG))
    .limit(1)
  if (!def) throw new Error(`seed productTagData missing "${ATOPIE_SLUG}" slug`)
  const rows = await testDb
    .select()
    .from(productTagLinks)
    .where(and(eq(productTagLinks.productId, productId), eq(productTagLinks.productTagId, def.id)))
  return rows.length
}

// Atopy-named so detectEczemaAtopieFromName fires; plain INCI adds no eczema signal.
const ATOPIE_NAME = 'Soin peau atopique'

describe('writeTagsForProduct — eczema-atopie withholding (intake wiring)', () => {
  beforeEach(async () => {
    await cleanDatabase()
    await testDb.insert(productTagTypes).values(productTagData)
  })

  it('withholds eczema-atopie when the description contraindicates atopy', async () => {
    const user = await createTestUser()
    const product = await createProduct(
      user.id,
      'admin',
      {
        name: ATOPIE_NAME,
        brand: 'Lab',
        kind: 'moisturizer',
        unit: 'tube',
        category: 'skincare',
        inci: 'Aqua, Glycerin, Phenoxyethanol',
        description: 'Déconseillé aux peaux atopiques sévères.',
      },
      testDb
    )
    expect(await eczemaRowCount(product.id)).toBe(0)
  })

  it('persists eczema-atopie for a plainly atopy-positioned product', async () => {
    const user = await createTestUser()
    const product = await createProduct(
      user.id,
      'admin',
      {
        name: ATOPIE_NAME,
        brand: 'Lab',
        kind: 'moisturizer',
        unit: 'tube',
        category: 'skincare',
        inci: 'Aqua, Glycerin, Phenoxyethanol',
        description: 'Apaise les sensations de démangeaison.',
      },
      testDb
    )
    expect(await eczemaRowCount(product.id)).toBe(1)
  })
})
