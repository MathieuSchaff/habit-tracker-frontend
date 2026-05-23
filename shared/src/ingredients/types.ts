import type { z } from 'zod'

import type {
  createIngredientSchema,
  ingredientChangesSchema,
  updateIngredientRouteSchema,
  updateIngredientSchema,
} from './schemas'

// TYPES

// z.infer<> aliases for all ingredient schemas
export type CreateIngredientInput = z.infer<typeof createIngredientSchema>
export type UpdateIngredientInput = z.infer<typeof updateIngredientSchema>
// IngredientChanges = the Zod-validated change payload (used for API + DB column type)
export type IngredientChanges = z.infer<typeof ingredientChangesSchema>
export type UpdateIngredientRouteInput = z.infer<typeof updateIngredientRouteSchema>

// Entity types
export type Ingredient = {
  id: string
  createdBy: string
  name: string
  slug: string
  description: string
  content: string
  type: string
  category: string | null
  createdAt: string | Date
  updatedAt: string | Date
}

export type IngredientEdit = {
  id: string
  ingredientId: string
  editedBy: string
  changes: Record<string, { old: string | null; new: string | null }>
  summary: string | null
  createdAt: string | Date
}

export type IngredientErrorCode =
  | 'ingredient_not_found'
  | 'ingredient_creation_failed'
  | 'ingredient_update_failed'
  | 'ingredient_delete_failed'
  | 'ingredient_already_exists'
  | 'unauthorized_access'
  | 'database_error'
  | 'slug_already_exists'
  | 'ingredient_update_conflict'
