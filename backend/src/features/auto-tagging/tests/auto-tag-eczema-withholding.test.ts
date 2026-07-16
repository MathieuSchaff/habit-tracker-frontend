// Writer-level guard for eczema-atopie withholding. partitionEczemaReview runs
// inside writeTagsForProduct (the intake path), not inside detectAllAutoTags, so
// the pure unit test in formula.test.ts does not prove the live wiring applies it.
// This pins it: a product whose description names atopy under a contraindication
// must not persist the tag; a plainly atopy-positioned product must.

import { beforeEach, describe, expect, it } from 'bun:test'

import { SKINCARE_PRODUCT_TAG_SLUGS } from '@aurore/shared'

import { productTagTypes } from '../../../db/schema'
import { productTagData } from '../../../db/seed/data/tags'
import { testDb } from '../../../tests/db.test.config'
import { cleanDatabase } from '../../../tests/helpers/db-cleaner'
import { createTestUser } from '../../../tests/helpers/test-factories'
import { createAutoTagProduct, getTagDefBySlug, getTagLinks } from './db-helpers'

const ATOPIE_SLUG = SKINCARE_PRODUCT_TAG_SLUGS.ECZEMA_ATOPIE

async function eczemaRowCount(productId: string): Promise<number> {
  const def = await getTagDefBySlug(ATOPIE_SLUG)
  return (await getTagLinks(productId, def.id)).length
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
    const product = await createAutoTagProduct(user.id, {
      name: ATOPIE_NAME,
      kind: 'moisturizer',
      unit: 'tube',
      inci: 'Aqua, Glycerin, Phenoxyethanol',
      description: 'Déconseillé aux peaux atopiques sévères.',
    })
    expect(await eczemaRowCount(product.id)).toBe(0)
  })

  it('persists eczema-atopie for a plainly atopy-positioned product', async () => {
    const user = await createTestUser()
    const product = await createAutoTagProduct(user.id, {
      name: ATOPIE_NAME,
      kind: 'moisturizer',
      unit: 'tube',
      inci: 'Aqua, Glycerin, Phenoxyethanol',
      description: 'Apaise les sensations de démangeaison.',
    })
    expect(await eczemaRowCount(product.id)).toBe(1)
  })
})
