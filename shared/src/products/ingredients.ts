import { z } from 'zod'

import type { HttpStatus } from '../core'
import { HTTP_STATUS } from '../core'

// SCHEMAS

export const createProductIngredientSchema = z.object({
  ingredientId: z.uuid(),
  concentrationValue: z.number().min(0).optional(),
  concentrationUnit: z.enum(['%', 'IU', 'mg', 'mcg', 'mg/mL']).optional(),
  concentrationPer: z.string().min(1).max(50).optional(),
  notes: z.string().max(500).optional(),
})

// TYPES

export type ProductIngredientErrorCode =
  | 'product_ingredient_not_found'
  | 'product_ingredient_already_exists'
  | 'ingredient_not_found'
  | 'database_error'

// HELPERS

export const productIngredientErrorMapping = {
  product_ingredient_not_found: HTTP_STATUS.NOT_FOUND,
  product_ingredient_already_exists: HTTP_STATUS.CONFLICT,
  ingredient_not_found: HTTP_STATUS.NOT_FOUND,
  database_error: HTTP_STATUS.INTERNAL_SERVER_ERROR,
} as const satisfies Record<ProductIngredientErrorCode, HttpStatus>
