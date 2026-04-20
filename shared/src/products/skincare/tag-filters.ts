import type { TagCategoryMeta } from '../../core'
import { SKINCARE_PRODUCT_TAG_CATEGORIES, type SkincareProductTagCategory } from './tag-taxonomy'

export const SKINCARE_PRODUCT_TAG_CATEGORY_META: Record<
  SkincareProductTagCategory,
  TagCategoryMeta
> = {
  skin_type: { label: 'Peau', placeholder: 'Tous types', tier: 'essential', order: 1 },
  concern: { label: 'Problème', placeholder: 'Toutes', tier: 'essential', order: 2 },
  skin_zone: { label: 'Zone', placeholder: 'Toutes', tier: 'essential', order: 3 },
  product_type: { label: 'Type', placeholder: 'Tous', tier: 'essential', order: 4 },
  routine_step: { label: 'Étape', placeholder: 'Toutes', tier: 'advanced', order: 5 },
  skin_effect: { label: 'Rendu', placeholder: 'Tous', tier: 'advanced', order: 6 },
  product_label: { label: 'Label', placeholder: 'Tous', tier: 'advanced', order: 7 },
  shared_label: { label: 'Comédogénicité', placeholder: 'Indifférent', tier: 'advanced', order: 8 },
}

export function skincareProductFilterCategories(): SkincareProductTagCategory[] {
  return [...SKINCARE_PRODUCT_TAG_CATEGORIES].sort(
    (a, b) =>
      SKINCARE_PRODUCT_TAG_CATEGORY_META[a].order - SKINCARE_PRODUCT_TAG_CATEGORY_META[b].order
  )
}
