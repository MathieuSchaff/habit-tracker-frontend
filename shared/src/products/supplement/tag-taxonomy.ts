import type { SupplementProductTagSlug } from './tag-slugs'

export const SUPPLEMENT_PRODUCT_TAG_CATEGORIES = [
  'goal',
  'product_type',
  'moment',
  'restriction',
  'product_label',
] as const

export type SupplementProductTagCategory = (typeof SUPPLEMENT_PRODUCT_TAG_CATEGORIES)[number]

export interface SupplementProductTagMeta {
  category: SupplementProductTagCategory
}

export const SUPPLEMENT_PRODUCT_TAG_TAXONOMY = {} as Record<
  SupplementProductTagSlug,
  SupplementProductTagMeta
>

export function getSupplementProductTagCategory(
  _slug: SupplementProductTagSlug
): SupplementProductTagCategory | undefined {
  return undefined
}
