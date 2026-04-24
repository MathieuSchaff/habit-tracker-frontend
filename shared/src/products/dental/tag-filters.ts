import type { TagCategoryMeta } from '../../core'
import { DENTAL_PRODUCT_TAG_CATEGORIES, type DentalProductTagCategory } from './tag-taxonomy'

export const DENTAL_PRODUCT_TAG_CATEGORY_META: Record<DentalProductTagCategory, TagCategoryMeta> = {
  concern: { label: 'Problème', placeholder: 'Tous', tier: 'essential', order: 1 },
  age_group: { label: 'Âge', placeholder: 'Tous', tier: 'essential', order: 2 },
  product_type: { label: 'Type', placeholder: 'Tous', tier: 'essential', order: 3 },
  dental_effect: { label: 'Bénéfice', placeholder: 'Tous', tier: 'advanced', order: 4 },
  product_label: { label: 'Label', placeholder: 'Tous', tier: 'advanced', order: 5 },
}

export function dentalProductFilterCategories(): DentalProductTagCategory[] {
  return [...DENTAL_PRODUCT_TAG_CATEGORIES].sort(
    (a, b) => DENTAL_PRODUCT_TAG_CATEGORY_META[a].order - DENTAL_PRODUCT_TAG_CATEGORY_META[b].order
  )
}
