import {
  type AllProductTagCategory,
  DENTAL_PRODUCT_TAG_CATEGORY_META,
  DOMAIN_PRODUCT_FILTER_CATEGORIES,
  HAIRCARE_PRODUCT_TAG_CATEGORY_META,
  PRODUCT_DOMAIN_TABS,
  type ProductDomainTab,
  SKINCARE_PRODUCT_TAG_CATEGORY_META,
  SUPPLEMENT_PRODUCT_TAG_CATEGORY_META,
  type TagCategoryMeta,
} from '@habit-tracker/shared'

import { z } from 'zod'

import { filterSearchSchema } from '@/component/Filter'

export type TagFilterKey = AllProductTagCategory

export type FilterKey = TagFilterKey | 'brand' | 'ingredient' | 'kind'

// Deduped union of all domain tag keys (skincare ∪ haircare ∪ dental ∪ supplement).
// Duplicates (concern, product_type, product_label, routine_step) appear only once.
const _allTagKeys = Object.values(DOMAIN_PRODUCT_FILTER_CATEGORIES).flat()
export const TAG_FILTER_KEYS = [...new Set(_allTagKeys)] as TagFilterKey[]

export const FILTER_KEYS = [...TAG_FILTER_KEYS, 'brand', 'ingredient', 'kind'] as (
  | TagFilterKey
  | 'brand'
  | 'ingredient'
  | 'kind'
)[]

// Re-export for components that need per-domain keys (useTagFilterGroups dispatch).
export const DOMAIN_TAG_KEYS = DOMAIN_PRODUCT_FILTER_CATEGORIES

// Per-domain meta (labels, placeholder, tier) — used by useTagFilterGroups.
export const DOMAIN_TAG_META: Record<ProductDomainTab, Record<string, TagCategoryMeta>> = {
  skincare: SKINCARE_PRODUCT_TAG_CATEGORY_META,
  haircare: HAIRCARE_PRODUCT_TAG_CATEGORY_META,
  dental: DENTAL_PRODUCT_TAG_CATEGORY_META,
  complement: SUPPLEMENT_PRODUCT_TAG_CATEGORY_META,
}

// Merge order: supplement/dental/haircare first → skincare wins for shared keys
// (concern="Problème", product_type="Type", product_label="Label", routine_step="Étape").
const _allMeta: Record<string, TagCategoryMeta> = {
  ...SUPPLEMENT_PRODUCT_TAG_CATEGORY_META,
  ...DENTAL_PRODUCT_TAG_CATEGORY_META,
  ...HAIRCARE_PRODUCT_TAG_CATEGORY_META,
  ...SKINCARE_PRODUCT_TAG_CATEGORY_META,
}

export const GROUP_LABELS: Record<FilterKey, string> = {
  ...(Object.fromEntries(TAG_FILTER_KEYS.map((k) => [k, _allMeta[k].label])) as Record<
    TagFilterKey,
    string
  >),
  brand: 'Marque',
  ingredient: 'Ingrédient',
  kind: 'Type',
}

// Kept as explicit overrides — special-case display tweaks not derivable from taxonomy.
export const LABEL_OVERRIDES: Record<string, string> = {
  'barriere-cutanee-alteree': 'Peau sensibilisée',
}

const { schema: baseSchema, defaultValues } = filterSearchSchema(FILTER_KEYS)

export const productsSearchSchema = baseSchema.extend({
  category: z.enum(PRODUCT_DOMAIN_TABS).default('skincare').catch('skincare'),
  kind: z.array(z.string()).default([]).catch([]),
  profile_filter: z.boolean().default(false).catch(false),
  sort: z.enum(['name', 'random', 'price_asc', 'price_desc', 'newest']).default('random').catch('random'),
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
