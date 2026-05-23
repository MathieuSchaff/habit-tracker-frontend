import { z } from 'zod'

import { fieldChangeSchema } from '../core'
import { DENTAL_INGREDIENT_CATEGORY_VALUES } from './dental/categories'
import { HAIRCARE_INGREDIENT_CATEGORY_VALUES } from './haircare/categories'
import { INGREDIENT_TYPE_VALUES, type IngredientType } from './ingredient-types'
import { SKINCARE_INGREDIENT_CATEGORY_VALUES } from './skincare/categories'
import { SUPPLEMENT_CATEGORY_VALUES } from './supplement/categories'

// SCHEMAS

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
// when type is also present in the payload — partial updates touching only
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
    name: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    slug: slugSchema.optional(),
    content: z.string().max(50000).optional(),
    type: ingredientTypeSchema,
    category: z.string().min(1).max(100).optional(),
  })
  .superRefine((data, ctx) => refineTypeCategory(data.type, data.category, ctx))

export const updateIngredientSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    slug: slugSchema.optional(),
    description: z.string().max(2000).optional(),
    content: z.string().max(50000).optional(),
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
