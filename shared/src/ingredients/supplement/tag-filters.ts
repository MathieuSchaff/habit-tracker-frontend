import type { TagCategoryMeta } from '../../core'
import { sortFilterCategories } from '../../tag-api/tag-taxonomy-builder'
import {
  SUPPLEMENT_INGREDIENT_TAG_CATEGORIES,
  type SupplementIngredientTagCategory,
} from './tag-taxonomy'

export const SUPPLEMENT_INGREDIENT_TAG_CATEGORY_META: Record<
  SupplementIngredientTagCategory,
  TagCategoryMeta
> = {
  goal: { label: 'Objectif', placeholder: 'Tous', tier: 'essential', order: 1 },
  moment: { label: 'Moment', placeholder: 'Indifférent', tier: 'essential', order: 2 },
  restriction: { label: 'Restrictions', placeholder: 'Aucune', tier: 'advanced', order: 3 },
  ingredient_attribute: {
    label: 'Propriété',
    placeholder: 'Toutes',
    tier: 'advanced',
    order: 4,
  },
}

export function supplementIngredientFilterCategories(): SupplementIngredientTagCategory[] {
  return sortFilterCategories(
    SUPPLEMENT_INGREDIENT_TAG_CATEGORIES,
    SUPPLEMENT_INGREDIENT_TAG_CATEGORY_META
  )
}
