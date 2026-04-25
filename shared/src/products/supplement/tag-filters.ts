import type { TagCategoryMeta } from '../../core'
import { sortFilterCategories } from '../tag-taxonomy-builder'
import {
  SUPPLEMENT_PRODUCT_TAG_CATEGORIES,
  type SupplementProductTagCategory,
} from './tag-taxonomy'

export const SUPPLEMENT_PRODUCT_TAG_CATEGORY_META: Record<
  SupplementProductTagCategory,
  TagCategoryMeta
> = {
  goal: { label: 'Objectif', placeholder: 'Tous', tier: 'essential', order: 1 },
  product_type: { label: 'Forme', placeholder: 'Toutes', tier: 'essential', order: 2 },
  moment: { label: 'Moment', placeholder: 'Tous', tier: 'essential', order: 3 },
  restriction: { label: 'Contre-indication', placeholder: 'Aucune', tier: 'advanced', order: 4 },
  product_label: { label: 'Label', placeholder: 'Tous', tier: 'advanced', order: 5 },
}

export function supplementProductFilterCategories(): SupplementProductTagCategory[] {
  return sortFilterCategories(
    SUPPLEMENT_PRODUCT_TAG_CATEGORIES,
    SUPPLEMENT_PRODUCT_TAG_CATEGORY_META
  )
}
