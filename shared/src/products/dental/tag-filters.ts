import type { TagCategoryMeta } from '../../core'
import { sortFilterCategories } from '../tag-taxonomy-builder'
import { DENTAL_PRODUCT_TAG_CATEGORIES, type DentalProductTagCategory } from './tag-taxonomy'

export const DENTAL_PRODUCT_TAG_CATEGORY_META: Record<DentalProductTagCategory, TagCategoryMeta> = {
  concern: { label: 'Problème', placeholder: 'Tous', tier: 'essential', order: 1 },
  age_group: { label: 'Âge', placeholder: 'Tous', tier: 'essential', order: 2 },
  product_type: { label: 'Type', placeholder: 'Tous', tier: 'essential', order: 3 },
  dental_effect: { label: 'Bénéfice', placeholder: 'Tous', tier: 'advanced', order: 4 },
  product_label: { label: 'Label', placeholder: 'Tous', tier: 'advanced', order: 5 },
}

export function dentalProductFilterCategories(): DentalProductTagCategory[] {
  return sortFilterCategories(DENTAL_PRODUCT_TAG_CATEGORIES, DENTAL_PRODUCT_TAG_CATEGORY_META)
}
