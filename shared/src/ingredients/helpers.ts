import type { HttpStatus } from '../core'
import { HTTP_STATUS } from '../core'
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

// Single source for the tag axes accepted by /api/ingredients. The query
// schema (see ./schemas) and both API clients derive from it, so a category
// added to a domain's tag-filters propagates without touching hand-kept lists
// (the `actif_class` bug was exactly such a desync).
export const ALL_INGREDIENT_FILTER_CATEGORIES: readonly AllIngredientTagCategory[] = [
  ...new Set(Object.values(DOMAIN_INGREDIENT_FILTER_CATEGORIES).flat()),
]

const INGREDIENT_TAXONOMIES = {
  [INGREDIENT_TYPES.SKINCARE]: SKINCARE_INGREDIENT_TAG_TAXONOMY,
  [INGREDIENT_TYPES.HAIRCARE]: HAIRCARE_INGREDIENT_TAG_TAXONOMY,
  [INGREDIENT_TYPES.DENTAL]: DENTAL_INGREDIENT_TAG_TAXONOMY,
  [INGREDIENT_TYPES.SUPPLEMENT]: SUPPLEMENT_INGREDIENT_TAG_TAXONOMY,
} as const

// Slugs known to a given (domain, category) pair. Drives drawer chips from
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
