export const HAIRCARE_PRODUCT_TAG_SLUGS = {} as const

export type HaircareProductTagSlug =
  (typeof HAIRCARE_PRODUCT_TAG_SLUGS)[keyof typeof HAIRCARE_PRODUCT_TAG_SLUGS]
