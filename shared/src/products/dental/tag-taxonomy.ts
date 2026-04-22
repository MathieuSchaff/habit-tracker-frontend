import type { DentalProductTagSlug } from './tag-slugs'

export const DENTAL_PRODUCT_TAG_CATEGORIES = [
  'concern',
  'age_group',
  'product_type',
  'dental_effect',
  'product_label',
] as const

export type DentalProductTagCategory = (typeof DENTAL_PRODUCT_TAG_CATEGORIES)[number]

export interface DentalProductTagMeta {
  category: DentalProductTagCategory
}

export const DENTAL_PRODUCT_TAG_TAXONOMY = {} as Record<DentalProductTagSlug, DentalProductTagMeta>

export function getDentalProductTagCategory(
  _slug: DentalProductTagSlug
): DentalProductTagCategory | undefined {
  return undefined
}
