// Filter keys for the ingredients list page. Derived from the shared
// ingredient taxonomy — one filter key per IngredientTagCategory.

import {
  INGREDIENT_TAG_CATEGORY_META,
  type IngredientTagCategory,
  ingredientFilterCategories,
} from '@habit-tracker/shared'

export type FilterKey = IngredientTagCategory

export const FILTER_KEYS = ingredientFilterCategories() as readonly FilterKey[]

export const GROUP_LABELS: Record<FilterKey, string> = Object.fromEntries(
  FILTER_KEYS.map((key) => [key, INGREDIENT_TAG_CATEGORY_META[key].label])
) as Record<FilterKey, string>
