import {
  buildTagBuckets,
  buildTagLabels,
  buildTagTaxonomy,
} from '../../tag-api/tag-taxonomy-builder'
import {
  DENTAL_PRODUCT_TAG_CATEGORIES,
  DENTAL_PRODUCT_TAG_DEFS,
  type DentalProductTagCategory,
  type DentalProductTagSlug,
} from './tag-slugs'

export const DENTAL_PRODUCT_TAG_TAXONOMY = buildTagTaxonomy<
  DentalProductTagSlug,
  DentalProductTagCategory
>(
  buildTagLabels(DENTAL_PRODUCT_TAG_DEFS),
  buildTagBuckets(DENTAL_PRODUCT_TAG_DEFS, DENTAL_PRODUCT_TAG_CATEGORIES)
)
