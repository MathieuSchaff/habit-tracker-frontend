import {
  buildTagBuckets,
  buildTagLabels,
  buildTagTaxonomy,
} from '../../tag-api/tag-taxonomy-builder'
import {
  SUPPLEMENT_PRODUCT_TAG_CATEGORIES,
  SUPPLEMENT_PRODUCT_TAG_DEFS,
  type SupplementProductTagCategory,
  type SupplementProductTagSlug,
} from './tag-slugs'

export const SUPPLEMENT_PRODUCT_TAG_TAXONOMY = buildTagTaxonomy<
  SupplementProductTagSlug,
  SupplementProductTagCategory
>(
  buildTagLabels(SUPPLEMENT_PRODUCT_TAG_DEFS),
  buildTagBuckets(SUPPLEMENT_PRODUCT_TAG_DEFS, SUPPLEMENT_PRODUCT_TAG_CATEGORIES)
)
