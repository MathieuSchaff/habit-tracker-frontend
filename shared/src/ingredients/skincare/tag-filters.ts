import type { TagCategoryMeta } from '../../core'
import {
  SKINCARE_INGREDIENT_TAG_CATEGORIES,
  type SkincareIngredientTagCategory,
} from './tag-taxonomy'

export const SKINCARE_INGREDIENT_TAG_CATEGORY_META: Record<
  SkincareIngredientTagCategory,
  TagCategoryMeta
> = {
  skin_type: { label: 'Peau', placeholder: 'Tous types', tier: 'essential', order: 1 },
  concern: { label: 'Problème', placeholder: 'Toutes', tier: 'essential', order: 2 },
  ingredient_attribute: { label: 'Rôle', placeholder: 'Tous', tier: 'advanced', order: 3 },
  skin_effect: { label: 'Rendu', placeholder: 'Tous', tier: 'advanced', order: 4 },
  shared_label: { label: 'Comédogénicité', placeholder: 'Indifférent', tier: 'advanced', order: 5 },
}

export function skincareIngredientFilterCategories(): SkincareIngredientTagCategory[] {
  return [...SKINCARE_INGREDIENT_TAG_CATEGORIES].sort(
    (a, b) =>
      SKINCARE_INGREDIENT_TAG_CATEGORY_META[a].order -
      SKINCARE_INGREDIENT_TAG_CATEGORY_META[b].order
  )
}
