import type { TagCategoryMeta } from '../../core'
import type { SupplementProductTagCategory } from './tag-taxonomy'

export const SUPPLEMENT_PRODUCT_TAG_CATEGORY_META: Record<
  SupplementProductTagCategory,
  TagCategoryMeta
> = {}

export function supplementProductFilterCategories(): SupplementProductTagCategory[] {
  return []
}
