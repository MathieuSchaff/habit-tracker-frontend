export const DENTAL_PRODUCT_TAG_SLUGS = {} as const

export type DentalProductTagSlug =
  (typeof DENTAL_PRODUCT_TAG_SLUGS)[keyof typeof DENTAL_PRODUCT_TAG_SLUGS]
