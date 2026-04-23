import type {
  DentalIngredientCategory,
  HaircareIngredientCategory,
  IngredientType,
  SkincareIngredientCategory,
  SupplementCategory,
} from '@habit-tracker/shared'

import type { INGREDIENT_SLUGS } from './ingredient-slugs'

export type IngredientSlug = (typeof INGREDIENT_SLUGS)[keyof typeof INGREDIENT_SLUGS]
export type IngredientCategory =
  | SkincareIngredientCategory
  | HaircareIngredientCategory
  | DentalIngredientCategory
  | SupplementCategory

export type IngredientInput = {
  name: string
  description: string
  slug: IngredientSlug
  content: string
  type: IngredientType
  category: IngredientCategory
}
