// DB fixtures shared by the auto-tagging write-path tests. Kept separate from
// helpers.ts so pure detector tests never import the pool transitively.

import { and, eq } from 'drizzle-orm'

import { productTagLinks, productTagTypes } from '../../../db/schema'
import { testDb } from '../../../tests/db.test.config'
import { createProduct } from '../../products/service'

type CreateProductInput = Parameters<typeof createProduct>[2]

// Admin-created product with the payload defaults every auto-tag DB test repeats.
export function createAutoTagProduct(
  userId: string,
  overrides: Partial<CreateProductInput> & Pick<CreateProductInput, 'name'>
) {
  return createProduct(
    userId,
    'admin',
    { brand: 'Lab', kind: 'serum', unit: 'pump', category: 'skincare', ...overrides },
    testDb
  )
}

export async function getTagDefBySlug(slug: string) {
  const [def] = await testDb
    .select()
    .from(productTagTypes)
    .where(eq(productTagTypes.slug, slug))
    .limit(1)
  if (!def) throw new Error(`seed productTagData missing "${slug}" slug`)
  return def
}

export function getTagLinks(productId: string, productTagId: string) {
  return testDb
    .select()
    .from(productTagLinks)
    .where(
      and(eq(productTagLinks.productId, productId), eq(productTagLinks.productTagId, productTagId))
    )
}
