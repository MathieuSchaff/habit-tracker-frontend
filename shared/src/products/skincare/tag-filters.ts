import type { TagCategoryMeta } from '../../core'
import { sortFilterCategories } from '../tag-taxonomy-builder'
import { SKINCARE_PRODUCT_TAG_CATEGORIES, type SkincareProductTagCategory } from './tag-taxonomy'

export const SKINCARE_PRODUCT_TAG_CATEGORY_META: Record<
  SkincareProductTagCategory,
  TagCategoryMeta
> = {
  skin_zone: {
    label: 'Zone',
    placeholder: 'Toutes',
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
  skin_effect: {
    label: 'Actions / Effets',
    placeholder: 'Tous',
    tier: 'essential',
    order: 3,
    defaultOpen: false,
  },
  skin_type: {
    label: 'Peau',
    placeholder: 'Tous types',
    tier: 'essential',
    order: 4,
    defaultOpen: false,
  },
  product_type_v2: {
    label: 'Type de produit',
    placeholder: 'Tous',
    tier: 'essential',
    order: 5,
    defaultOpen: false,
  },
  texture: {
    label: 'Forme - Galénique',
    placeholder: 'Toutes',
    tier: 'essential',
    order: 6,
    defaultOpen: false,
  },
  routine_step_v2: { label: 'Étape routine', placeholder: 'Toutes', tier: 'advanced', order: 7 },
  routine_moment: {
    label: 'Moment',
    placeholder: 'Tous',
    tier: 'advanced',
    order: 8,
    defaultOpen: false,
  },
  sensation: { label: 'Sensation', placeholder: 'Toutes', tier: 'advanced', order: 9 },
  product_characteristic: {
    label: 'Caractéristiques produit',
    placeholder: 'Toutes',
    tier: 'advanced',
    order: 10,
  },
}

export function skincareProductFilterCategories(): SkincareProductTagCategory[] {
  return sortFilterCategories(SKINCARE_PRODUCT_TAG_CATEGORIES, SKINCARE_PRODUCT_TAG_CATEGORY_META)
}
