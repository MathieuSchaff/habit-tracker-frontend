import type { TagCategoryMeta } from '../../core'
import { sortFilterCategories } from '../../tag-taxonomy-builder'
import { HAIRCARE_INGREDIENT_TAG_CATEGORIES, type HaircareIngredientTagCategory } from './tag-slugs'

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
  return sortFilterCategories(
    HAIRCARE_INGREDIENT_TAG_CATEGORIES,
    HAIRCARE_INGREDIENT_TAG_CATEGORY_META
  )
}
