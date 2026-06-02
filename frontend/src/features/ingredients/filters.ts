// Tag axes are the union of all ingredient domains; drawer renders only the categories of
// the selected `type`. Active domain lives in URL search param `type` (default 'skincare').

import {
  type AllIngredientTagCategory,
  DENTAL_INGREDIENT_TAG_CATEGORY_META,
  DOMAIN_INGREDIENT_FILTER_CATEGORIES,
  HAIRCARE_INGREDIENT_TAG_CATEGORY_META,
  INGREDIENT_TYPE_LABELS,
  INGREDIENT_TYPE_VALUES,
  type IngredientType,
  SKINCARE_INGREDIENT_TAG_CATEGORY_META,
  SUPPLEMENT_INGREDIENT_TAG_CATEGORY_META,
  type TagCategoryMeta,
} from '@aurore/shared'

import { z } from 'zod'

import { filterSearchSchema } from '@/component/Filter'
import type { TabOption } from '@/component/Tabs/Tabs'

export type FilterKey = AllIngredientTagCategory

// concern/ingredient_attribute appear in multiple domains; Set deduplicates.
const _allTagKeys = Object.values(DOMAIN_INGREDIENT_FILTER_CATEGORIES).flat()
export const FILTER_KEYS = [...new Set(_allTagKeys)] as FilterKey[]

export const DOMAIN_TAG_META: Record<IngredientType, Record<string, TagCategoryMeta>> = {
  skincare: SKINCARE_INGREDIENT_TAG_CATEGORY_META,
  haircare: HAIRCARE_INGREDIENT_TAG_CATEGORY_META,
  dental: DENTAL_INGREDIENT_TAG_CATEGORY_META,
  supplement: SUPPLEMENT_INGREDIENT_TAG_CATEGORY_META,
}

// Skincare wins for duplicate keys; all four domains use the same label today so order is cosmetic.
const _mergedMeta: Record<string, TagCategoryMeta> = {
  ...SUPPLEMENT_INGREDIENT_TAG_CATEGORY_META,
  ...DENTAL_INGREDIENT_TAG_CATEGORY_META,
  ...HAIRCARE_INGREDIENT_TAG_CATEGORY_META,
  ...SKINCARE_INGREDIENT_TAG_CATEGORY_META,
}

export const GROUP_LABELS: Record<FilterKey, string> = Object.fromEntries(
  FILTER_KEYS.map((k) => [k, _mergedMeta[k].label])
) as Record<FilterKey, string>

export const DOMAIN_TAB_OPTIONS: TabOption<IngredientType>[] = INGREDIENT_TYPE_VALUES.map((id) => ({
  id,
  label: INGREDIENT_TYPE_LABELS[id],
}))

const { schema: baseSchema, defaultValues } = filterSearchSchema(FILTER_KEYS)

export const ingredientsSearchSchema = baseSchema.extend({
  type: z.enum(INGREDIENT_TYPE_VALUES).default('skincare'),
  profile_filter: z.boolean().default(false),
})

export const ingredientsSearchDefaults = {
  ...defaultValues,
  type: 'skincare' as IngredientType,
  profile_filter: false,
}

// Categories from the previous domain are invalid against the new one (e.g. skin_type vs dental).
export function buildDomainSwitchSearch(
  prev: Record<string, unknown>,
  next: IngredientType,
  emptyTagFilters: Record<FilterKey, string[]>
): Record<string, unknown> {
  return { ...prev, ...emptyTagFilters, type: next, page: 1 }
}
