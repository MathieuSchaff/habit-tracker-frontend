import { z } from 'zod'

// Query schema for GET /products. Discriminated on `category` so each domain
// declares only its own filter keys — prevents e.g. skin_type from leaking into
// a haircare request. Per-domain keys mirror shared/src/products/{domain}/tag-filters.ts.

const sortEnum = z.enum(['name', 'random', 'price_asc', 'price_desc', 'newest'])

const baseListProductsQuery = z.object({
  kind: z.string().optional(),
  brand: z.string().optional(),
  ingredient: z.string().optional(),
  avoid_for: z.string().optional(),
  priceMin: z.coerce.number().int().min(0).optional(),
  priceMax: z.coerce.number().int().min(0).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: sortEnum.optional(),
})

export const skincareListProductsQuery = baseListProductsQuery.extend({
  category: z.literal('skincare'),
  routine_step: z.string().optional(),
  skin_type: z.string().optional(),
  concern: z.string().optional(),
  product_type: z.string().optional(),
  skin_zone: z.string().optional(),
  skin_effect: z.string().optional(),
  product_label: z.string().optional(),
  shared_label: z.string().optional(),
})

export const haircareListProductsQuery = baseListProductsQuery.extend({
  category: z.literal('haircare'),
  concern: z.string().optional(),
  hair_type: z.string().optional(),
  product_type: z.string().optional(),
  routine_step: z.string().optional(),
  hair_effect: z.string().optional(),
  product_label: z.string().optional(),
})

export const dentalListProductsQuery = baseListProductsQuery.extend({
  category: z.literal('dental'),
  concern: z.string().optional(),
  age_group: z.string().optional(),
  product_type: z.string().optional(),
  dental_effect: z.string().optional(),
  product_label: z.string().optional(),
})

export const complementListProductsQuery = baseListProductsQuery.extend({
  category: z.literal('complement'),
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
