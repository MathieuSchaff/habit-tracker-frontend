import type { TagCategoryMeta } from '../../core'
import { DENTAL_INGREDIENT_TAG_CATEGORIES, type DentalIngredientTagCategory } from './tag-taxonomy'

export const DENTAL_INGREDIENT_TAG_CATEGORY_META: Record<
  DentalIngredientTagCategory,
  TagCategoryMeta
> = {
  concern: { label: 'Problème', placeholder: 'Tous', tier: 'essential', order: 1 },
  age_group: { label: 'Public', placeholder: 'Tous', tier: 'essential', order: 2 },
  ingredient_attribute: { label: 'Rôle', placeholder: 'Tous', tier: 'advanced', order: 3 },
  dental_effect: { label: 'Effet', placeholder: 'Tous', tier: 'advanced', order: 4 },
}

export function dentalIngredientFilterCategories(): DentalIngredientTagCategory[] {
  return [...DENTAL_INGREDIENT_TAG_CATEGORIES].sort(
    (a, b) =>
      DENTAL_INGREDIENT_TAG_CATEGORY_META[a].order - DENTAL_INGREDIENT_TAG_CATEGORY_META[b].order
  )
}
