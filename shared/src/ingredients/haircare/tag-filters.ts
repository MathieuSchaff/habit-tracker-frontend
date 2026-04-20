import type { TagCategoryMeta } from '../../core'
import {
  HAIRCARE_INGREDIENT_TAG_CATEGORIES,
  type HaircareIngredientTagCategory,
} from './tag-taxonomy'

export const HAIRCARE_INGREDIENT_TAG_CATEGORY_META: Record<
  HaircareIngredientTagCategory,
  TagCategoryMeta
> = {
  concern: { label: 'Problème', placeholder: 'Tous', tier: 'essential', order: 1 },
  hair_type: { label: 'Type', placeholder: 'Tous', tier: 'essential', order: 2 },
  ingredient_attribute: { label: 'Rôle', placeholder: 'Tous', tier: 'advanced', order: 3 },
  hair_effect: { label: 'Rendu', placeholder: 'Tous', tier: 'advanced', order: 4 },
}

export function haircareIngredientFilterCategories(): HaircareIngredientTagCategory[] {
  return [...HAIRCARE_INGREDIENT_TAG_CATEGORIES].sort(
    (a, b) =>
      HAIRCARE_INGREDIENT_TAG_CATEGORY_META[a].order -
      HAIRCARE_INGREDIENT_TAG_CATEGORY_META[b].order
  )
}
