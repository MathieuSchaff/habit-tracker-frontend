import {
  DOMAIN_PRODUCT_FILTER_CATEGORIES,
  PRODUCT_CATEGORY_TO_DOMAIN_TAB,
} from '@habit-tracker/shared'

import { eq, inArray } from 'drizzle-orm'

import type { DB } from '../../../db'
import { products, productTagsDefs } from '../../../db/schema'
import { ProductError } from '../product-error'

// Reject tag links that don't belong to the product's domain — e.g. a
// hair_type tag attached to a skincare product. Zod can't enforce this
// (cross-row relational rule), and the frontend filter alone is not a
// boundary against direct API calls or service-level seeds.
export async function assertTagsMatchProductDomain(
  db: DB,
  productId: string,
  tagIds: readonly string[]
): Promise<void> {
  if (tagIds.length === 0) return

  const [product] = await db
    .select({ category: products.category })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1)
  if (!product) throw new ProductError('product_not_found')

  const domain = PRODUCT_CATEGORY_TO_DOMAIN_TAB[product.category]
  const validTagTypes = new Set<string>(DOMAIN_PRODUCT_FILTER_CATEGORIES[domain])

  const tags = await db
    .select({
      id: productTagsDefs.id,
      slug: productTagsDefs.slug,
      tagType: productTagsDefs.tagType,
    })
    .from(productTagsDefs)
    .where(inArray(productTagsDefs.id, [...tagIds]))

  const invalid = tags.filter((t) => !validTagTypes.has(t.tagType))
  if (invalid.length > 0) {
    throw new ProductError('tag_domain_mismatch', {
      productCategory: product.category,
      domain,
      validTagTypes: [...validTagTypes],
      invalidTags: invalid.map((t) => ({ slug: t.slug, tagType: t.tagType })),
    })
  }
}
