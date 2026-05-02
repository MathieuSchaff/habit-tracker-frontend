import { z } from 'zod'

import { PRODUCT_DOMAIN_DB_CATEGORIES, type ProductDomainTab } from './domain-tabs'
import { PRODUCT_KINDS } from './kinds'

// Query schema for GET /products. Discriminated on `category` so each domain
// declares only its own filter keys — prevents e.g. skin_type from leaking into
// a haircare request. Per-domain keys mirror shared/src/products/{domain}/tag-filters.ts.

const sortEnum = z.enum(['name', 'random', 'price_asc', 'price_desc', 'newest'])

// Reject ?kind=<value> that does not belong to the tab's DB categories
// (e.g. skincare tab + kind=shampoo). Skincare tab spans skincare/solaire/bodycare,
// so the valid kind set is the union of those PRODUCT_KINDS buckets.
const validKindsForDomain = (domain: ProductDomainTab): Set<string> => {
  const valid = new Set<string>()
  for (const cat of PRODUCT_DOMAIN_DB_CATEGORIES[domain]) {
    for (const v of Object.values(PRODUCT_KINDS[cat])) valid.add(v)
  }
  return valid
}

const kindFilterFor = (domain: ProductDomainTab) => {
  const valid = validKindsForDomain(domain)
  return z
    .string()
    .optional()
    .refine((v) => v === undefined || v.split(',').every((k) => valid.has(k.trim())), {
      message: `kind must be one of: ${[...valid].sort().join(', ')}`,
    })
}

const baseListProductsQuery = z.object({
  brand: z.string().optional(),
  ingredient: z.string().optional(),
  avoid_for: z.string().optional(),
  // Free-text search across product name + brand. Used as a fallback intent
  // when the header search query matches neither a brand nor an ingredient.
  q: z.string().trim().min(1).max(100).optional(),
  priceMin: z.coerce.number().int().min(0).optional(),
  priceMax: z.coerce.number().int().min(0).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: sortEnum.optional(),
})

export const skincareListProductsQuery = baseListProductsQuery.extend({
  category: z.literal('skincare'),
  kind: kindFilterFor('skincare'),
  routine_step_v2: z.string().optional(),
  routine_moment: z.string().optional(),
  skin_type: z.string().optional(),
  concern: z.string().optional(),
  product_type_v2: z.string().optional(),
  texture: z.string().optional(),
  skin_zone: z.string().optional(),
  skin_effect: z.string().optional(),
  product_label: z.string().optional(),
  shared_label: z.string().optional(),
})

export const haircareListProductsQuery = baseListProductsQuery.extend({
  category: z.literal('haircare'),
  kind: kindFilterFor('haircare'),
  concern: z.string().optional(),
  hair_type: z.string().optional(),
  product_type: z.string().optional(),
  routine_step: z.string().optional(),
  hair_effect: z.string().optional(),
  product_label: z.string().optional(),
})

export const dentalListProductsQuery = baseListProductsQuery.extend({
  category: z.literal('dental'),
  kind: kindFilterFor('dental'),
  concern: z.string().optional(),
  age_group: z.string().optional(),
  product_type: z.string().optional(),
  dental_effect: z.string().optional(),
  product_label: z.string().optional(),
})

export const complementListProductsQuery = baseListProductsQuery.extend({
  category: z.literal('complement'),
  kind: kindFilterFor('complement'),
  goal: z.string().optional(),
  product_type: z.string().optional(),
  moment: z.string().optional(),
  restriction: z.string().optional(),
  product_label: z.string().optional(),
})

export const listProductsQuery = z.discriminatedUnion('category', [
  skincareListProductsQuery,
  haircareListProductsQuery,
  dentalListProductsQuery,
  complementListProductsQuery,
])

export type SkincareListProductsFilters = z.infer<typeof skincareListProductsQuery>
export type HaircareListProductsFilters = z.infer<typeof haircareListProductsQuery>
export type DentalListProductsFilters = z.infer<typeof dentalListProductsQuery>
export type ComplementListProductsFilters = z.infer<typeof complementListProductsQuery>
export type ListProductsFilters = z.infer<typeof listProductsQuery>
