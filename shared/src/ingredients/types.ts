import type { z } from 'zod'

import type {
  createIngredientSchema,
  ingredientChangesSchema,
  ingredientEditResponseSchema,
  ingredientFilterOptionsSchema,
  ingredientResponseSchema,
  ingredientSearchResultSchema,
  ingredientsSearchSchema,
  updateIngredientRouteSchema,
  updateIngredientSchema,
} from './schemas'

// TYPES

// z.infer<> aliases for all ingredient schemas
export type CreateIngredientInput = z.infer<typeof createIngredientSchema>
export type UpdateIngredientInput = z.infer<typeof updateIngredientSchema>
export type IngredientResponse = z.infer<typeof ingredientResponseSchema>
export type IngredientSearchResult = z.infer<typeof ingredientSearchResultSchema>
export type IngredientEditResponse = z.infer<typeof ingredientEditResponseSchema>
// IngredientChanges = the Zod-validated change payload (used for API + DB column type)
export type IngredientChanges = z.infer<typeof ingredientChangesSchema>
export type IngredientFilterOptions = z.infer<typeof ingredientFilterOptionsSchema>
export type IngredientSearchFilters = z.infer<typeof ingredientsSearchSchema>
export type UpdateIngredientRouteInput = z.infer<typeof updateIngredientRouteSchema>

// Entity types
export type Ingredient = {
  id: string
  createdBy: string
  name: string
  slug: string
  description: string
  content: string
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

// only the fields a user is allowed to change (no id, slug, timestamps…)
export type EditableIngredientKeys = Exclude<
  keyof Ingredient,
  'id' | 'createdBy' | 'createdAt' | 'slug' | 'updatedAt'
>

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
