export const HAIRCARE_INGREDIENT_CATEGORIES = {
  ACTIF: 'actif',
  CONDITIONNEUR: 'conditionneur',
  FILMOGENE: 'filmogene',
  HUMECTANT: 'humectant',
  TENSIOACTIF: 'tensioactif',
  EXCIPIENT: 'excipient',
} as const

export type HaircareIngredientCategory =
  (typeof HAIRCARE_INGREDIENT_CATEGORIES)[keyof typeof HAIRCARE_INGREDIENT_CATEGORIES]

export const HAIRCARE_INGREDIENT_CATEGORY_VALUES = Object.values(
  HAIRCARE_INGREDIENT_CATEGORIES
) as [HaircareIngredientCategory, ...HaircareIngredientCategory[]]
