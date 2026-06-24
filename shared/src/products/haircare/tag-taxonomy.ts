import {
  buildTagBuckets,
  buildTagLabels,
  buildTagTaxonomy,
} from '../../tag-api/tag-taxonomy-builder'
import {
  HAIRCARE_PRODUCT_TAG_CATEGORIES,
  HAIRCARE_PRODUCT_TAG_DEFS,
  type HaircareProductTagCategory,
  type HaircareProductTagSlug,
} from './tag-slugs'

export const HAIRCARE_PRODUCT_TAG_TAXONOMY = buildTagTaxonomy<
  HaircareProductTagSlug,
  HaircareProductTagCategory
>(
  buildTagLabels(HAIRCARE_PRODUCT_TAG_DEFS),
  buildTagBuckets(HAIRCARE_PRODUCT_TAG_DEFS, HAIRCARE_PRODUCT_TAG_CATEGORIES)
)
