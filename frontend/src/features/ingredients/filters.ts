// Filter keys for the ingredients list page. Derived from the shared
// taxonomy: one filter key per TagCategory that is filterable on an
// ingredient (scope='ingredient' or 'both'). No hand-maintained list.

import { filterCategoriesFor, TAG_CATEGORY_META, type TagCategory } from '@habit-tracker/shared'

export type FilterKey = Extract<
  TagCategory,
  'skin_type' | 'concern' | 'ingredient_attribute' | 'skin_effect' | 'shared_label'
>

export const FILTER_KEYS = filterCategoriesFor('ingredient') as readonly FilterKey[]

export const GROUP_LABELS: Record<FilterKey, string> = Object.fromEntries(
  FILTER_KEYS.map((key) => [key, TAG_CATEGORY_META[key].label])
) as Record<FilterKey, string>
