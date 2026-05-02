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
  product_type_v2: {
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
  texture: {
    label: 'Texture',
    placeholder: 'Toutes',
    tier: 'essential',
    order: 5,
    defaultOpen: false,
  },
  // Moment = essential : "produit du matin/soir" = filtre haute fréquence.
  routine_moment: {
    label: 'Moment',
    placeholder: 'Tous',
    tier: 'essential',
    order: 6,
    defaultOpen: false,
  },
  routine_step_v2: { label: 'Étape', placeholder: 'Toutes', tier: 'advanced', order: 7 },
  skin_effect: { label: 'Rendu', placeholder: 'Tous', tier: 'advanced', order: 8 },
  product_label: { label: 'Label', placeholder: 'Tous', tier: 'advanced', order: 9 },
  shared_label: {
    label: 'Comédogénicité',
    placeholder: 'Indifférent',
    tier: 'advanced',
    order: 10,
  },
}

export function skincareProductFilterCategories(): SkincareProductTagCategory[] {
  return sortFilterCategories(SKINCARE_PRODUCT_TAG_CATEGORIES, SKINCARE_PRODUCT_TAG_CATEGORY_META)
}
