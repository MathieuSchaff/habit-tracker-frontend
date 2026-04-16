// Ingredient Types
// Top-level domain axis: what kind of product/use the ingredient belongs to.

export const INGREDIENT_TYPES = {
  SKINCARE: 'skincare',
  HAIRCARE: 'haircare',
  DENTAL: 'dental',
  SUPPLEMENT: 'supplement',
} as const

export type IngredientType = (typeof INGREDIENT_TYPES)[keyof typeof INGREDIENT_TYPES]

export const INGREDIENT_TYPE_VALUES = Object.values(INGREDIENT_TYPES) as [
  IngredientType,
  ...IngredientType[],
]

export const INGREDIENT_TYPE_LABELS: Record<IngredientType, string> = {
  skincare: 'Soins peau',
  haircare: 'Cheveux',
  dental: 'Dents',
  supplement: 'Compléments alimentaires',
}
