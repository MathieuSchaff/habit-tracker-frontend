// Filter keys for the ingredients list page. Tag axes are the union of all
// ingredient domains (skincare ∪ haircare ∪ dental ∪ supplement) — drawer
// only renders the categories of the currently selected `type`. The active
// domain itself lives in URL search param `type` (default `'skincare'`).

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
} from '@habit-tracker/shared'

import { z } from 'zod'

import { filterSearchSchema } from '@/component/Filter'
import type { TabOption } from '@/component/Tabs/Tabs'

export type FilterKey = AllIngredientTagCategory

// Deduped union of every domain's tag filter categories. Concern, ingredient_attribute
// appear in several domains — the Set keeps them once.
const _allTagKeys = Object.values(DOMAIN_INGREDIENT_FILTER_CATEGORIES).flat()
export const FILTER_KEYS = [...new Set(_allTagKeys)] as FilterKey[]

// Per-domain tag-category meta lookup (used by the filter drawer hook).
export const DOMAIN_TAG_META: Record<IngredientType, Record<string, TagCategoryMeta>> = {
  skincare: SKINCARE_INGREDIENT_TAG_CATEGORY_META,
  haircare: HAIRCARE_INGREDIENT_TAG_CATEGORY_META,
  dental: DENTAL_INGREDIENT_TAG_CATEGORY_META,
  supplement: SUPPLEMENT_INGREDIENT_TAG_CATEGORY_META,
}

// Merged labels — first-domain-wins for duplicate keys (skincare's label for
// `concern` is the canonical one users see in active-filter chips, even when
// the chip came from haircare/dental/supplement). All four domains use the
// same FR label "Problème" today, so the order is cosmetic.
const _mergedMeta: Record<string, TagCategoryMeta> = {
  ...SUPPLEMENT_INGREDIENT_TAG_CATEGORY_META,
  ...DENTAL_INGREDIENT_TAG_CATEGORY_META,
  ...HAIRCARE_INGREDIENT_TAG_CATEGORY_META,
  ...SKINCARE_INGREDIENT_TAG_CATEGORY_META,
}

export const GROUP_LABELS: Record<FilterKey, string> = Object.fromEntries(
  FILTER_KEYS.map((k) => [k, _mergedMeta[k].label])
) as Record<FilterKey, string>

// Tabs at the top of the page — one per domain.
export const DOMAIN_TAB_OPTIONS: TabOption<IngredientType>[] = INGREDIENT_TYPE_VALUES.map((id) => ({
  id,
  label: INGREDIENT_TYPE_LABELS[id],
}))

// URL search schema. `type` is single-valued (the active tab); each tag axis
// is a string[]. Switching tabs resets all tag axes via `buildDomainSwitchSearch`.
const { schema: baseSchema, defaultValues } = filterSearchSchema(FILTER_KEYS)

export const ingredientsSearchSchema = baseSchema.extend({
  type: z.enum(INGREDIENT_TYPE_VALUES).default('skincare'),
})

export const ingredientsSearchDefaults = {
  ...defaultValues,
  type: 'skincare' as IngredientType,
}

// Reset every tag filter when the user switches domain — categories from the
// previous domain aren't valid against the new one (e.g. `skin_type` doesn't
// apply to dental ingredients).
export function buildDomainSwitchSearch(
  prev: Record<string, unknown>,
  next: IngredientType,
  emptyTagFilters: Record<FilterKey, string[]>
): Record<string, unknown> {
  return { ...prev, ...emptyTagFilters, type: next, page: 1 }
}
