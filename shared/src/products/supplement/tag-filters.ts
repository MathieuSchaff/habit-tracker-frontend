import type { TagCategoryMeta } from '../../core'
import {
  SUPPLEMENT_PRODUCT_TAG_CATEGORIES,
  type SupplementProductTagCategory,
} from './tag-taxonomy'

export const SUPPLEMENT_PRODUCT_TAG_CATEGORY_META: Record<
  SupplementProductTagCategory,
  TagCategoryMeta
> = {
  goal: { label: 'Objectif', placeholder: 'Tous', tier: 'essential', order: 1 },
  product_type: { label: 'Type', placeholder: 'Tous', tier: 'essential', order: 2 },
  moment: { label: 'Moment', placeholder: 'Tous', tier: 'advanced', order: 3 },
  restriction: { label: 'Restriction', placeholder: 'Toutes', tier: 'advanced', order: 4 },
  product_label: { label: 'Label', placeholder: 'Tous', tier: 'advanced', order: 5 },
}

export function supplementProductFilterCategories(): SupplementProductTagCategory[] {
  return [...SUPPLEMENT_PRODUCT_TAG_CATEGORIES].sort(
    (a, b) =>
      SUPPLEMENT_PRODUCT_TAG_CATEGORY_META[a].order - SUPPLEMENT_PRODUCT_TAG_CATEGORY_META[b].order
  )
}
