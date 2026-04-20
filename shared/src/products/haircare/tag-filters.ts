import type { TagCategoryMeta } from '../../core'
import type { HaircareProductTagCategory } from './tag-taxonomy'

export const HAIRCARE_PRODUCT_TAG_CATEGORY_META: Record<
  HaircareProductTagCategory,
  TagCategoryMeta
> = {}

export function haircareProductFilterCategories(): HaircareProductTagCategory[] {
  return []
}
