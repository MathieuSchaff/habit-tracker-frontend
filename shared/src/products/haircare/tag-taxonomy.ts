import type { HaircareProductTagSlug } from './tag-slugs'

export const HAIRCARE_PRODUCT_TAG_CATEGORIES = [] as const

export type HaircareProductTagCategory = (typeof HAIRCARE_PRODUCT_TAG_CATEGORIES)[number]

export interface HaircareProductTagMeta {
  category: HaircareProductTagCategory
}

export const HAIRCARE_PRODUCT_TAG_TAXONOMY = {} as Record<
  HaircareProductTagSlug,
  HaircareProductTagMeta
>

export function getHaircareProductTagCategory(
  _slug: HaircareProductTagSlug
): HaircareProductTagCategory | undefined {
  return undefined
}
