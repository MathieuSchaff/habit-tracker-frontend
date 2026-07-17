import {
  type AllProductTagCategory,
  DENTAL_PRODUCT_TAG_TAXONOMY,
  getProductFilterDefinition,
  HAIRCARE_PRODUCT_TAG_TAXONOMY,
  PRODUCT_DOMAIN_TABS,
  type ProductDomainTab,
  type ProductFilterDefinition,
  productSortEnum,
  SKINCARE_PRODUCT_TAG_TAXONOMY,
  SUPPLEMENT_PRODUCT_TAG_TAXONOMY,
} from '@aurore/shared'

import { z } from 'zod'

// Deep import: pulling the schema from the barrel drags FilterDrawer/ChipGroup CSS
// into the eager route-config graph (render-blocking). helpers.ts is zod-only.
import { filterSearchSchema } from '@/component/Filter/helpers'

export type TagFilterKey = AllProductTagCategory

export type FilterKey = TagFilterKey | 'brand' | 'ingredient'

const _definitionsByDomain: Record<ProductDomainTab, ProductFilterDefinition[]> = {
  skincare: getProductFilterDefinition('skincare'),
  haircare: getProductFilterDefinition('haircare'),
  dental: getProductFilterDefinition('dental'),
  complement: getProductFilterDefinition('complement'),
}
const _allTagKeys = PRODUCT_DOMAIN_TABS.flatMap((domain) =>
  _definitionsByDomain[domain].map(({ key }) => key)
)
export const TAG_FILTER_KEYS = [...new Set(_allTagKeys)] as TagFilterKey[]

export const FILTER_KEYS = [...TAG_FILTER_KEYS, 'brand', 'ingredient'] as (
  | TagFilterKey
  | 'brand'
  | 'ingredient'
)[]

export const NON_TAG_FILTER_LABELS = {
  brand: 'Marque',
  ingredient: 'Ingrédient',
} as const satisfies Record<'brand' | 'ingredient', string>

export const NON_TAG_FILTER_PLACEHOLDERS = {
  brand: 'Rechercher une marque...',
  ingredient: 'Rechercher un ingrédient...',
} as const satisfies Record<'brand' | 'ingredient', string>

export const GROUP_LABELS: Record<FilterKey, string> = {
  ...(Object.fromEntries(
    // Skincare wins for shared keys (concern, product_type, product_label, routine_step).
    (['complement', 'dental', 'haircare', 'skincare'] as const).flatMap((domain) =>
      _definitionsByDomain[domain].map(({ key, label }) => [key, label])
    )
  ) as Record<TagFilterKey, string>),
  ...NON_TAG_FILTER_LABELS,
}

// Merged tag-slug to label map across the 4 domain taxonomies. Overlapping slugs share labels.
const ALL_TAG_LABELS = {
  ...Object.fromEntries(
    Object.entries(SKINCARE_PRODUCT_TAG_TAXONOMY).map(([slug, m]) => [slug, m.label])
  ),
  ...Object.fromEntries(
    Object.entries(HAIRCARE_PRODUCT_TAG_TAXONOMY).map(([slug, m]) => [slug, m.label])
  ),
  ...Object.fromEntries(
    Object.entries(DENTAL_PRODUCT_TAG_TAXONOMY).map(([slug, m]) => [slug, m.label])
  ),
  ...Object.fromEntries(
    Object.entries(SUPPLEMENT_PRODUCT_TAG_TAXONOMY).map(([slug, m]) => [slug, m.label])
  ),
}

export function tagLabel(slug: string): string {
  return ALL_TAG_LABELS[slug] ?? slug
}

const { schema: baseSchema, defaultValues } = filterSearchSchema(FILTER_KEYS)

export const productsSearchSchema = baseSchema
  .extend({
    category: z.enum(PRODUCT_DOMAIN_TABS).default('skincare'),
    profile_filter: z.boolean().default(false),
    sort: productSortEnum.optional(),
    priceMin: z.number().int().min(0).optional(),
    priceMax: z.number().int().min(0).optional(),
    // catch: a hand-crafted/shared URL with an invalid q (whitespace-only, >100 chars)
    // must degrade to the plain list, not throw past the route into GlobalError.
    q: z.string().trim().min(1).max(100).optional().catch(undefined),
  })
  // Contextual sort default: a q without explicit sort means relevance; relevance
  // without q is meaningless and heals back to newest. Both mappings are stable
  // under re-validation (TanStack round-trips validateSearch output through the URL).
  .transform((s) => {
    const sort = s.sort ?? (s.q ? ('relevance' as const) : ('newest' as const))
    return { ...s, sort: sort === 'relevance' && !s.q ? ('newest' as const) : sort }
  })

export type ProductsSearch = z.infer<typeof productsSearchSchema>

export const productsSearchDefaults = {
  ...defaultValues,
  category: 'skincare' as ProductDomainTab,
  profile_filter: false,
  sort: 'newest' as const,
}
