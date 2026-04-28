import type { TagCategoryMeta } from '../../core'
import { sortFilterCategories } from '../tag-taxonomy-builder'
import { SKINCARE_PRODUCT_TAG_CATEGORIES, type SkincareProductTagCategory } from './tag-taxonomy'

export const SKINCARE_PRODUCT_TAG_CATEGORY_META: Record<
  SkincareProductTagCategory,
  TagCategoryMeta
> = {
  skin_type: {
    label: 'Peau',
    placeholder: 'Tous types',
    tier: 'essential',
    order: 1,
    defaultOpen: true,
  },
  concern: {
    label: 'Problème',
    placeholder: 'Toutes',
    tier: 'essential',
    order: 2,
    defaultOpen: true,
  },
  // product_type before skin_zone — "type de produit" matches user intent
  // ("je veux un sérum") more often than "zone" on the discovery flow.
  product_type: {
    label: 'Type',
    placeholder: 'Tous',
    tier: 'essential',
    order: 3,
    defaultOpen: false,
  },
  skin_zone: {
    label: 'Zone',
    placeholder: 'Toutes',
    tier: 'essential',
    order: 4,
    defaultOpen: false,
  },
  routine_step: { label: 'Étape', placeholder: 'Toutes', tier: 'advanced', order: 5 },
  skin_effect: { label: 'Rendu', placeholder: 'Tous', tier: 'advanced', order: 6 },
  product_label: { label: 'Label', placeholder: 'Tous', tier: 'advanced', order: 7 },
  shared_label: { label: 'Comédogénicité', placeholder: 'Indifférent', tier: 'advanced', order: 8 },
}

export function skincareProductFilterCategories(): SkincareProductTagCategory[] {
  return sortFilterCategories(SKINCARE_PRODUCT_TAG_CATEGORIES, SKINCARE_PRODUCT_TAG_CATEGORY_META)
}
