import { z } from 'zod'

import type { HttpStatus } from '../core'
import { HTTP_STATUS, tagItemSchema } from '../core'
import { dentalIngredientFilterCategories } from './dental/tag-filters'
import type { DentalIngredientTagCategory } from './dental/tag-slugs'
import { DENTAL_INGREDIENT_TAG_TAXONOMY } from './dental/tag-taxonomy'
import { haircareIngredientFilterCategories } from './haircare/tag-filters'
import type { HaircareIngredientTagCategory } from './haircare/tag-slugs'
import { HAIRCARE_INGREDIENT_TAG_TAXONOMY } from './haircare/tag-taxonomy'
import { INGREDIENT_TYPES, type IngredientType } from './ingredient-types'
import { skincareIngredientFilterCategories } from './skincare/tag-filters'
import type { SkincareIngredientTagCategory } from './skincare/tag-slugs'
import { SKINCARE_INGREDIENT_TAG_TAXONOMY } from './skincare/tag-taxonomy'
import { supplementIngredientFilterCategories } from './supplement/tag-filters'
import type { SupplementIngredientTagCategory } from './supplement/tag-slugs'
import { SUPPLEMENT_INGREDIENT_TAG_TAXONOMY } from './supplement/tag-taxonomy'
import type { IngredientErrorCode } from './types'

export const ingredientErrorMapping = {
  ingredient_not_found: HTTP_STATUS.NOT_FOUND,
  ingredient_creation_failed: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  ingredient_update_failed: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  ingredient_delete_failed: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  ingredient_already_exists: HTTP_STATUS.CONFLICT,
  ingredient_rate_limited: HTTP_STATUS.RATE_LIMIT_EXCEEDED,
  unauthorized_access: HTTP_STATUS.FORBIDDEN,
  database_error: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  slug_already_exists: HTTP_STATUS.CONFLICT,
  ingredient_update_conflict: HTTP_STATUS.CONFLICT,
} as const satisfies Record<IngredientErrorCode, HttpStatus>

// Tag category union (all four domains)

export type AllIngredientTagCategory =
  | SkincareIngredientTagCategory
  | HaircareIngredientTagCategory
  | DentalIngredientTagCategory
  | SupplementIngredientTagCategory

// Maps each ingredient domain to its tag filter category keys. Drives the
// drawer accordion list per selected domain tab.
export const DOMAIN_INGREDIENT_FILTER_CATEGORIES: Record<
  IngredientType,
  readonly AllIngredientTagCategory[]
> = {
  [INGREDIENT_TYPES.SKINCARE]: skincareIngredientFilterCategories(),
  [INGREDIENT_TYPES.HAIRCARE]: haircareIngredientFilterCategories(),
  [INGREDIENT_TYPES.DENTAL]: dentalIngredientFilterCategories(),
  [INGREDIENT_TYPES.SUPPLEMENT]: supplementIngredientFilterCategories(),
}

const INGREDIENT_TAXONOMIES = {
  [INGREDIENT_TYPES.SKINCARE]: SKINCARE_INGREDIENT_TAG_TAXONOMY,
  [INGREDIENT_TYPES.HAIRCARE]: HAIRCARE_INGREDIENT_TAG_TAXONOMY,
  [INGREDIENT_TYPES.DENTAL]: DENTAL_INGREDIENT_TAG_TAXONOMY,
  [INGREDIENT_TYPES.SUPPLEMENT]: SUPPLEMENT_INGREDIENT_TAG_TAXONOMY,
} as const

// Slugs known to a given (domain, category) pair — drives drawer chips from
// shared rather than from whatever happens to be seeded server-side.
export function getIngredientTagsByCategory(
  domain: IngredientType,
  category: AllIngredientTagCategory
): { slug: string }[] {
  const tax = INGREDIENT_TAXONOMIES[domain] as Record<string, { category: string }>
  const out: { slug: string }[] = []
  for (const [slug, meta] of Object.entries(tax)) {
    if (meta.category === category) out.push({ slug })
  }
  return out
}

// /api/ingredients query schema
// Tag axes are the union of all four domains so a single endpoint serves any
// selected `ingredient_type`. Coerce because query params arrive as strings.

const INGREDIENT_SORT_VALUES = ['name', 'random'] as const
const ingredientSortEnum = z.enum(INGREDIENT_SORT_VALUES)
export type IngredientSort = z.infer<typeof ingredientSortEnum>

export const listIngredientsSearchSchema = z.object({
  // Tag axes — comma-separated slug lists, AND across keys / OR within.
  concern: z.string().optional(),
  skin_type: z.string().optional(),
  hair_type: z.string().optional(),
  age_group: z.string().optional(),
  goal: z.string().optional(),
  moment: z.string().optional(),
  restriction: z.string().optional(),
  ingredient_attribute: z.string().optional(),
  skin_effect: z.string().optional(),
  hair_effect: z.string().optional(),
  dental_effect: z.string().optional(),
  shared_label: z.string().optional(),
  // Domain — comma-separated `IngredientType` values.
  ingredient_type: z.string().optional(),
  // Profile-derived avoid tags (skin types + concerns). Flags rows post-fetch
  // as `profileMatches`; never excludes — keeps the catalog visible.
  avoid_for: z.string().optional(),
  // Pagination / sort
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: ingredientSortEnum.optional(),
  quality: z.enum(['unverified', 'verified']).optional(),
  status: z.enum(['visible', 'hidden']).optional(),
})

export type ListIngredientsSearchFilters = z.infer<typeof listIngredientsSearchSchema>

// /api/ingredients/filter-options response shape
// Flat array — each tag row carries its category + count. One shape works for
// every domain; frontend partitions by `category` to drive drawer chips.

const ingredientFilterOptionsTagSchema = tagItemSchema.extend({
  category: z.string(),
  count: z.number().int().nonnegative(),
})

const ingredientFilterOptionsSchema = z.object({
  tags: z.array(ingredientFilterOptionsTagSchema),
})

export type IngredientFilterOptionsTag = z.infer<typeof ingredientFilterOptionsTagSchema>
export type IngredientFilterOptions = z.infer<typeof ingredientFilterOptionsSchema>
