// Filter keys for the ingredients list page. Derived from the shared
// skincare ingredient taxonomy — one filter key per SkincareIngredientTagCategory.

import {
  SKINCARE_INGREDIENT_TAG_CATEGORY_META,
  type SkincareIngredientTagCategory,
  skincareIngredientFilterCategories,
} from '@habit-tracker/shared'

export type FilterKey = SkincareIngredientTagCategory

export const FILTER_KEYS = skincareIngredientFilterCategories() as readonly FilterKey[]

export const GROUP_LABELS: Record<FilterKey, string> = Object.fromEntries(
  FILTER_KEYS.map((key) => [key, SKINCARE_INGREDIENT_TAG_CATEGORY_META[key].label])
) as Record<FilterKey, string>
