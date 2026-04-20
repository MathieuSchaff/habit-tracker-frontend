import type { TagCategoryMeta } from '../../core'
import type { DentalProductTagCategory } from './tag-taxonomy'

export const DENTAL_PRODUCT_TAG_CATEGORY_META: Record<DentalProductTagCategory, TagCategoryMeta> =
  {}

export function dentalProductFilterCategories(): DentalProductTagCategory[] {
  return []
}
