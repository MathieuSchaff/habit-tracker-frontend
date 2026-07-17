import type { TagCategoryMeta } from '../../core'
import { sortFilterCategories } from '../../tag-taxonomy-builder'
import { DENTAL_INGREDIENT_TAG_CATEGORIES, type DentalIngredientTagCategory } from './tag-slugs'

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
  return sortFilterCategories(DENTAL_INGREDIENT_TAG_CATEGORIES, DENTAL_INGREDIENT_TAG_CATEGORY_META)
}
