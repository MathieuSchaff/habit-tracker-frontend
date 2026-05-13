import {
  type AllProductTagCategory,
  DENTAL_PRODUCT_TAG_CATEGORY_META,
  DENTAL_PRODUCT_TAG_TAXONOMY,
  DOMAIN_PRODUCT_FILTER_CATEGORIES,
  HAIRCARE_PRODUCT_TAG_CATEGORY_META,
  HAIRCARE_PRODUCT_TAG_TAXONOMY,
  PRODUCT_DOMAIN_TABS,
  type ProductDomainTab,
  productSortEnum,
  SKINCARE_PRODUCT_TAG_CATEGORY_META,
  SKINCARE_PRODUCT_TAG_TAXONOMY,
  SUPPLEMENT_PRODUCT_TAG_CATEGORY_META,
  SUPPLEMENT_PRODUCT_TAG_TAXONOMY,
  type TagCategoryMeta,
} from '@habit-tracker/shared'

import { z } from 'zod'

import { filterSearchSchema } from '@/component/Filter'

export type TagFilterKey = AllProductTagCategory

export type FilterKey = TagFilterKey | 'brand' | 'ingredient'

// Deduped union of all domain tag keys (skincare ∪ haircare ∪ dental ∪ supplement).
// Duplicates (concern, product_type, product_label, routine_step) appear only once.
const _allTagKeys = Object.values(DOMAIN_PRODUCT_FILTER_CATEGORIES).flat()
export const TAG_FILTER_KEYS = [...new Set(_allTagKeys)] as TagFilterKey[]

export const FILTER_KEYS = [...TAG_FILTER_KEYS, 'brand', 'ingredient'] as (
  | TagFilterKey
  | 'brand'
  | 'ingredient'
)[]

// Merge order: supplement/dental/haircare first → skincare wins for shared keys
// (concern="Problème", product_type="Type", product_label="Label", routine_step="Étape").
const _allMeta: Record<string, TagCategoryMeta> = {
  ...SUPPLEMENT_PRODUCT_TAG_CATEGORY_META,
  ...DENTAL_PRODUCT_TAG_CATEGORY_META,
  ...HAIRCARE_PRODUCT_TAG_CATEGORY_META,
  ...SKINCARE_PRODUCT_TAG_CATEGORY_META,
}

// Labels for non-tag filters — tag labels come from shared metas above.
export const NON_TAG_FILTER_LABELS = {
  brand: 'Marque',
  ingredient: 'Ingrédient',
} as const satisfies Record<'brand' | 'ingredient', string>

export const NON_TAG_FILTER_PLACEHOLDERS = {
  brand: 'Rechercher une marque...',
  ingredient: 'Rechercher un ingrédient...',
} as const satisfies Record<'brand' | 'ingredient', string>

export const GROUP_LABELS: Record<FilterKey, string> = {
  ...(Object.fromEntries(TAG_FILTER_KEYS.map((k) => [k, _allMeta[k].label])) as Record<
    TagFilterKey,
    string
  >),
  ...NON_TAG_FILTER_LABELS,
}

// Kept as explicit overrides — special-case display tweaks not derivable from taxonomy.
export const LABEL_OVERRIDES: Record<string, string> = {
  'barriere-cutanee-alteree': 'Peau sensibilisée',
}

// Merged tag-slug → label lookup across all 4 domain taxonomies. Slugs are effectively
// unique; when they overlap (e.g. peau-grasse exists in skincare + haircare) labels match.
const ALL_TAG_LABELS: Record<string, string> = {
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
  return LABEL_OVERRIDES[slug] ?? ALL_TAG_LABELS[slug] ?? slug
}

const { schema: baseSchema, defaultValues } = filterSearchSchema(FILTER_KEYS)

export const productsSearchSchema = baseSchema.extend({
  category: z.enum(PRODUCT_DOMAIN_TABS).default('skincare'),
  profile_filter: z.boolean().default(false),
  sort: productSortEnum.default('newest'),
  priceMin: z.number().int().min(0).optional(),
  priceMax: z.number().int().min(0).optional(),
  q: z.string().trim().min(1).max(100).optional(),
})

export const productsSearchDefaults = {
  ...defaultValues,
  category: 'skincare' as ProductDomainTab,
  profile_filter: false,
  sort: 'newest' as const,
}
