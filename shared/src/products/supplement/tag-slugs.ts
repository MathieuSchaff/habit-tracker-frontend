export const SUPPLEMENT_PRODUCT_TAG_SLUGS = {} as const

export type SupplementProductTagSlug =
  (typeof SUPPLEMENT_PRODUCT_TAG_SLUGS)[keyof typeof SUPPLEMENT_PRODUCT_TAG_SLUGS]
