export const DENTAL_INGREDIENT_CATEGORIES = {
  ACTIF: 'actif',
  ABRASIF: 'abrasif',
  AROMATISANT: 'aromatisant',
  HUMECTANT: 'humectant',
  TENSIOACTIF: 'tensioactif',
  EXCIPIENT: 'excipient',
} as const

export type DentalIngredientCategory =
  (typeof DENTAL_INGREDIENT_CATEGORIES)[keyof typeof DENTAL_INGREDIENT_CATEGORIES]

export const DENTAL_INGREDIENT_CATEGORY_VALUES = Object.values(DENTAL_INGREDIENT_CATEGORIES) as [
  DentalIngredientCategory,
  ...DentalIngredientCategory[],
]
