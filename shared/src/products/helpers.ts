import type { HttpStatus } from '../core'
import { HTTP_STATUS } from '../core'
import {
  DENTAL_PRODUCT_TAG_TAXONOMY,
  type DentalProductTagCategory,
  dentalProductFilterCategories,
} from './dental'
import type { ProductDomainTab } from './domain-tabs'
import {
  HAIRCARE_PRODUCT_TAG_TAXONOMY,
  type HaircareProductTagCategory,
  haircareProductFilterCategories,
} from './haircare'
import {
  SKINCARE_PRODUCT_TAG_TAXONOMY,
  type SkincareProductTagCategory,
  skincareProductFilterCategories,
} from './skincare'
import {
  SUPPLEMENT_PRODUCT_TAG_TAXONOMY,
  type SupplementProductTagCategory,
  supplementProductFilterCategories,
} from './supplement'
import type { ProductErrorCode } from './types'

export const productErrorMapping = {
  product_not_found: HTTP_STATUS.NOT_FOUND,
  product_creation_failed: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  product_update_failed: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  product_delete_failed: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  product_already_exists: HTTP_STATUS.CONFLICT,
  unauthorized_access: HTTP_STATUS.FORBIDDEN,
  database_error: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  tag_domain_mismatch: HTTP_STATUS.BAD_REQUEST,
} as const satisfies Record<ProductErrorCode, HttpStatus>

export type AllProductTagCategory =
  | SkincareProductTagCategory
  | HaircareProductTagCategory
  | DentalProductTagCategory
  | SupplementProductTagCategory

// Maps each domain tab to its tag filter category keys.
// Used by both frontend (buildProductsApiFilters, filterSearchSchema) and backend
// (getFilterOptions — future fix).
export const DOMAIN_PRODUCT_FILTER_CATEGORIES: Record<
  ProductDomainTab,
  readonly AllProductTagCategory[]
> = {
  skincare: skincareProductFilterCategories(),
  haircare: haircareProductFilterCategories(),
  dental: dentalProductFilterCategories(),
  complement: supplementProductFilterCategories(), // tab "complement" → domaine supplement
}

const PRODUCT_TAXONOMIES = {
  skincare: SKINCARE_PRODUCT_TAG_TAXONOMY,
  haircare: HAIRCARE_PRODUCT_TAG_TAXONOMY,
  dental: DENTAL_PRODUCT_TAG_TAXONOMY,
  complement: SUPPLEMENT_PRODUCT_TAG_TAXONOMY,
} as const satisfies Record<ProductDomainTab, Record<string, { category: string; label: string }>>

// Look up the FR label of a product tag slug across every domain taxonomy.
// Cross-domain duplicates (vegan, sans-parfum, …) are aligned by construction
// so first-match wins is safe.
export function getProductTagLabel(slug: string): string | undefined {
  for (const tax of Object.values(PRODUCT_TAXONOMIES)) {
    const meta = (tax as Record<string, { label: string }>)[slug]
    if (meta) return meta.label
  }
  return undefined
}

// Cross-domain category lookup. Pass `domain` to scope the search when the
// same slug exists under different categories per domain (rare but possible).
export function getProductTagCategory(
  slug: string,
  domain?: ProductDomainTab
): AllProductTagCategory | undefined {
  const taxonomies = domain ? [PRODUCT_TAXONOMIES[domain]] : Object.values(PRODUCT_TAXONOMIES)
  for (const tax of taxonomies) {
    const meta = (tax as Record<string, { category: AllProductTagCategory }>)[slug]
    if (meta) return meta.category
  }
  return undefined
}

// Return the slugs + FR labels for a given domain × category pair, used by
// the frontend filter drawer to drive chips from shared (instead of relying
// on what happens to be seeded server-side).
export function getProductTagsByCategory(
  domain: ProductDomainTab,
  category: AllProductTagCategory
): { slug: string; label: string }[] {
  const tax = PRODUCT_TAXONOMIES[domain] as Record<string, { category: string; label: string }>
  const out: { slug: string; label: string }[] = []
  for (const [slug, meta] of Object.entries(tax)) {
    if (meta.category === category) out.push({ slug, label: meta.label })
  }
  return out
}
