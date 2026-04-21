// Filter keys for the products list page. Derived from the shared skincare
// taxonomy + a couple of product-only filters (`brand`, `ingredient`) that are
// not tag categories.

import {
  PRODUCT_DOMAIN_TABS,
  type ProductDomainTab,
  SKINCARE_PRODUCT_TAG_CATEGORY_META,
  type SkincareProductTagCategory,
  skincareProductFilterCategories,
} from '@habit-tracker/shared'

import { z } from 'zod'

import { filterSearchSchema } from '@/component/Filter'

export type TagFilterKey = SkincareProductTagCategory

export type FilterKey = TagFilterKey | 'brand' | 'ingredient' | 'kind'

export const TAG_FILTER_KEYS = skincareProductFilterCategories() as readonly TagFilterKey[]

export const FILTER_KEYS = [...TAG_FILTER_KEYS, 'brand', 'ingredient', 'kind'] as const

export const GROUP_LABELS: Record<FilterKey, string> = {
  ...(Object.fromEntries(
    TAG_FILTER_KEYS.map((k) => [k, SKINCARE_PRODUCT_TAG_CATEGORY_META[k].label])
  ) as Record<TagFilterKey, string>),
  brand: 'Marque',
  ingredient: 'Ingr.',
  kind: 'Type',
}

// Kept as explicit overrides — these are special-case display tweaks,
// not derivable from the taxonomy.
export const LABEL_OVERRIDES: Record<string, string> = {
  'barriere-cutanee-alteree': 'Peau sensibilisée',
}

// Route search params schema — isolated here so it can be unit-tested
// without going through TanStack Router's route file.
const { schema: baseSchema, defaultValues } = filterSearchSchema(FILTER_KEYS)

export const productsSearchSchema = baseSchema.extend({
  category: z.enum(PRODUCT_DOMAIN_TABS).default('skincare'),
  kind: z.array(z.string()).default([]),
  profile_filter: z.boolean().default(false),
  sort: z.enum(['name', 'random', 'price_asc', 'price_desc', 'newest']).default('random'),
  priceMin: z.number().int().min(0).optional(),
  priceMax: z.number().int().min(0).optional(),
})

export const productsSearchDefaults = {
  ...defaultValues,
  category: 'skincare' as ProductDomainTab,
  kind: [] as string[],
  profile_filter: false,
  sort: 'random' as const,
}
