// Filter keys for the products list page. Derived from shared taxonomy
// + a couple of product-only filters (`brand`, `ingredient`) that are
// not tag categories.

import {
  PRODUCT_TAG_CATEGORY_META,
  type ProductTagCategory,
  productFilterCategories,
} from '@habit-tracker/shared'

export type TagFilterKey = ProductTagCategory

export type FilterKey = TagFilterKey | 'brand' | 'ingredient'

export const TAG_FILTER_KEYS = productFilterCategories() as readonly TagFilterKey[]

export const FILTER_KEYS = [...TAG_FILTER_KEYS, 'brand', 'ingredient'] as const

export const GROUP_LABELS: Record<FilterKey, string> = {
  ...(Object.fromEntries(
    TAG_FILTER_KEYS.map((k) => [k, PRODUCT_TAG_CATEGORY_META[k].label])
  ) as Record<TagFilterKey, string>),
  brand: 'Marque',
  ingredient: 'Ingr.',
}

// Kept as explicit overrides — these are special-case display tweaks,
// not derivable from the taxonomy.
export const LABEL_OVERRIDES: Record<string, string> = {
  'barriere-alteree': 'Peau sensibilisée',
}
