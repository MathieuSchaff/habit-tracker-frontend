// Skincare Ingredient Categories
// Functional role values for ingredients with `type === 'skincare'`.
// Dental/haircare/supplement have their own category sets.

export const SKINCARE_INGREDIENT_CATEGORIES = {
  ACTIF: 'actif',
  HUMECTANT: 'humectant',
  EMOLLIENT: 'emollient',
  FILTRE_UV: 'filtre-uv',
  TENSIOACTIF: 'tensioactif',
  EXCIPIENT: 'excipient',
} as const

export type SkincareIngredientCategory =
  (typeof SKINCARE_INGREDIENT_CATEGORIES)[keyof typeof SKINCARE_INGREDIENT_CATEGORIES]

// For Zod enum validation
export const SKINCARE_INGREDIENT_CATEGORY_VALUES = Object.values(
  SKINCARE_INGREDIENT_CATEGORIES
) as [SkincareIngredientCategory, ...SkincareIngredientCategory[]]
