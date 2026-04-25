import type { TagCategoryMeta } from '../../core'
import { sortFilterCategories } from '../tag-taxonomy-builder'
import { HAIRCARE_PRODUCT_TAG_CATEGORIES, type HaircareProductTagCategory } from './tag-taxonomy'

export const HAIRCARE_PRODUCT_TAG_CATEGORY_META: Record<
  HaircareProductTagCategory,
  TagCategoryMeta
> = {
  hair_type: { label: 'Cheveux', placeholder: 'Tous types', tier: 'essential', order: 1 },
  concern: { label: 'Problème', placeholder: 'Toutes', tier: 'essential', order: 2 },
  product_type: { label: 'Type', placeholder: 'Tous', tier: 'essential', order: 3 },
  routine_step: { label: 'Étape', placeholder: 'Toutes', tier: 'advanced', order: 4 },
  hair_effect: { label: 'Bénéfice', placeholder: 'Tous', tier: 'advanced', order: 5 },
  product_label: { label: 'Label', placeholder: 'Tous', tier: 'advanced', order: 6 },
}

export function haircareProductFilterCategories(): HaircareProductTagCategory[] {
  return sortFilterCategories(HAIRCARE_PRODUCT_TAG_CATEGORIES, HAIRCARE_PRODUCT_TAG_CATEGORY_META)
}
