import { z } from 'zod'

import { fieldChangeSchema, noHtml, tagItemSchema } from '../core'
import { DENTAL_INGREDIENT_CATEGORY_VALUES } from './dental/categories'
import { HAIRCARE_INGREDIENT_CATEGORY_VALUES } from './haircare/categories'
import type { AllIngredientTagCategory } from './helpers'
import { ALL_INGREDIENT_FILTER_CATEGORIES } from './helpers'
import { INGREDIENT_TYPE_VALUES, type IngredientType } from './ingredient-types'
import { SKINCARE_INGREDIENT_CATEGORY_VALUES } from './skincare/categories'
import { SUPPLEMENT_CATEGORY_VALUES } from './supplement/categories'

const slugSchema = z
  .string()
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })

const ingredientTypeSchema = z.enum(INGREDIENT_TYPE_VALUES)

const INGREDIENT_CATEGORIES_BY_TYPE: Record<IngredientType, readonly string[]> = {
  skincare: SKINCARE_INGREDIENT_CATEGORY_VALUES,
  haircare: HAIRCARE_INGREDIENT_CATEGORY_VALUES,
  dental: DENTAL_INGREDIENT_CATEGORY_VALUES,
  supplement: SUPPLEMENT_CATEGORY_VALUES,
}

// Cross-field check: category must belong to the type's allowed set. Skipped
// when category is null/undefined (clear/unset). On update, only validated
// when type is also present in the payload. Partial updates touching only
// `category` rely on service-layer merge with the stored type.
const refineTypeCategory = (
  type: IngredientType | undefined,
  category: string | null | undefined,
  ctx: z.RefinementCtx
) => {
  if (!type || category == null) return
  const allowed = INGREDIENT_CATEGORIES_BY_TYPE[type]
  if (!allowed.includes(category)) {
    ctx.addIssue({
      code: 'custom',
      path: ['category'],
      message: `Category "${category}" not allowed for type "${type}". Expected one of: ${allowed.join(', ')}`,
    })
  }
}

export const createIngredientSchema = z
  .object({
    name: noHtml(z.string().trim().min(2).max(200)),
    description: noHtml(z.string().max(2000)).optional(),
    slug: slugSchema.optional(),
    content: noHtml(z.string().max(50000)).optional(),
    type: ingredientTypeSchema,
    category: z.string().min(1).max(100).optional(),
  })
  .superRefine((data, ctx) => refineTypeCategory(data.type, data.category, ctx))

// slug is immutable after creation (C-4): not re-derived on rename, not
// client-settable. Renaming an ingredient keeps its original slug so bookmarks
// and the unique-key invariant hold.
export const updateIngredientSchema = z
  .object({
    name: noHtml(z.string().trim().min(2).max(200)).optional(),
    description: noHtml(z.string().max(2000)).optional(),
    content: noHtml(z.string().max(50000)).optional(),
    type: ingredientTypeSchema.optional(),
    category: z.string().min(1).max(100).nullable().optional(),
  })
  .strict()
  .superRefine((data, ctx) => refineTypeCategory(data.type, data.category, ctx))

// partial because an edit can touch only some fields, but at least one is required
export const ingredientChangesSchema = z
  .object({
    name: fieldChangeSchema(z.string()),
    description: fieldChangeSchema(z.string()),
    content: fieldChangeSchema(z.string()),
    type: fieldChangeSchema(z.enum(INGREDIENT_TYPE_VALUES)),
    category: fieldChangeSchema(z.string()), // free-form text, no enum
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field change is required',
  })

export const updateIngredientRouteSchema = updateIngredientSchema.extend({
  expectedUpdatedAt: z.iso.datetime().optional(),
  summary: z.string().max(500).optional(),
})

// /api/ingredients query schema
// Tag axes are the union of all four domains so a single endpoint serves any
// selected `ingredient_type`. Coerce because query params arrive as strings.

const INGREDIENT_SORT_VALUES = ['name', 'random'] as const
const ingredientSortEnum = z.enum(INGREDIENT_SORT_VALUES)
export type IngredientSort = z.infer<typeof ingredientSortEnum>

// Tag axes: comma-separated slug lists. AND across keys, OR within.
const tagAxisShape = Object.fromEntries(
  ALL_INGREDIENT_FILTER_CATEGORIES.map((axis) => [axis, z.string().optional()])
) as Record<AllIngredientTagCategory, z.ZodOptional<z.ZodString>>

export const listIngredientsSearchSchema = z.object({
  ...tagAxisShape,
  // Domain: comma-separated `IngredientType` values.
  ingredient_type: z.string().optional(),
  // Profile-derived avoid tags (skin types + concerns). Flags rows post-fetch
  // as `profileMatches`; never excludes, keeps the catalog visible.
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
// Flat array: each tag row carries its category + count. One shape works for
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
