import type { ProductCategory } from '@aurore/shared'
import { PRODUCT_KINDS } from '@aurore/shared'

import type { Ingredient, ProductTagGroups, UnifiedProductSeed } from './types'

const kindToCategory: Record<string, ProductCategory> = Object.fromEntries(
  (Object.entries(PRODUCT_KINDS) as [ProductCategory, Record<string, string>][]).flatMap(
    ([cat, kinds]) => Object.values(kinds).map((k) => [k, cat])
  )
)

// Skeleton: the per-brand seed files (~1900 products) were removed — the live
// catalogue lives in the SQL snapshot, not in TS. RICQLES_SEED is kept as a
// shape example. To seed products from TS again, drop new `*.seed.ts` files
// under products/<domain>/<brand>/ and spread them into `allUnified` below.
import { RICQLES_SEED } from './dental/ricqles/ricqles.seed'

const allUnified: UnifiedProductSeed[] = [...RICQLES_SEED]

// Derived exports (previously split across 4 files)

export const allProductData = allUnified.map(
  ({ tags: _tags, keyIngredients: _ki, ...product }) => ({
    category: kindToCategory[product.kind],
    ...product,
  })
)

export const allProductTagsMap: Record<string, ProductTagGroups> = Object.fromEntries(
  allUnified.map((p) => [p.slug, p.tags])
)

const allProductIngredientsMap: Record<string, Ingredient[]> = Object.fromEntries(
  allUnified.flatMap((p) =>
    p.keyIngredients && p.keyIngredients.length > 0 ? [[p.slug, p.keyIngredients] as const] : []
  )
)

export const allIngredientProductTags = Object.entries(allProductIngredientsMap).flatMap(
  ([productSlug, ings]) =>
    ings.map((ing) => ({
      productSlug,
      ingredientSlug: ing.slug,
      concentrationValue: ing.concentrationValue ?? ing.value ?? null,
      concentrationUnit: ing.concentrationUnit ?? ing.unit ?? null,
      notes: ing.notes ?? null,
    }))
)
