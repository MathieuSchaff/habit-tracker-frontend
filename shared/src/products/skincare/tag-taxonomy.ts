import {
  buildTagBuckets,
  buildTagLabels,
  buildTagSubgroups,
  buildTagTaxonomy,
} from '../../tag-api/tag-taxonomy-builder'
import {
  SKINCARE_PRODUCT_TAG_CATEGORIES,
  SKINCARE_PRODUCT_TAG_DEFS,
  type SkincareProductTagCategory,
  type SkincareProductTagSlug,
} from './tag-slugs'

const BUCKETS = buildTagBuckets(SKINCARE_PRODUCT_TAG_DEFS, SKINCARE_PRODUCT_TAG_CATEGORIES)

export const SKINCARE_PRODUCT_TAG_TAXONOMY = buildTagTaxonomy<
  SkincareProductTagSlug,
  SkincareProductTagCategory
>(buildTagLabels(SKINCARE_PRODUCT_TAG_DEFS), BUCKETS)

// Concern groups are display-only — DB stores flat concern slugs.
// filter-definition.ts consumes them to expose two named sub-sections.
const SKINCARE_PRODUCT_CONCERN_GROUP_KEYS = ['functional', 'aesthetic'] as const
export type SkincareProductConcernGroup = (typeof SKINCARE_PRODUCT_CONCERN_GROUP_KEYS)[number]

export const SKINCARE_PRODUCT_CONCERN_GROUPS: Record<
  SkincareProductConcernGroup,
  readonly SkincareProductTagSlug[]
> = buildTagSubgroups(SKINCARE_PRODUCT_TAG_DEFS, SKINCARE_PRODUCT_CONCERN_GROUP_KEYS)

// Membership check for the auto-tag pipeline's primary-promotion pass. Derived
// from the same defs as the taxonomy so adding a concern slug is a single edit.
export const SKINCARE_CONCERN_SLUGS: ReadonlySet<SkincareProductTagSlug> = new Set(BUCKETS.concern)

// product_characteristic groups are display-only — DB stores flat slugs with
// type='product_characteristic'. filter-definition.ts consumes them to expose
// four named sub-sections (tolerance / ethique / technique / comedogenicite).
const SKINCARE_PRODUCT_CHARACTERISTIC_GROUP_KEYS = [
  'tolerance',
  'ethique',
  'technique',
  'comedogenicite',
] as const
export type SkincareProductCharacteristicGroup =
  (typeof SKINCARE_PRODUCT_CHARACTERISTIC_GROUP_KEYS)[number]

export const SKINCARE_PRODUCT_CHARACTERISTIC_GROUPS: Record<
  SkincareProductCharacteristicGroup,
  readonly SkincareProductTagSlug[]
> = buildTagSubgroups(SKINCARE_PRODUCT_TAG_DEFS, SKINCARE_PRODUCT_CHARACTERISTIC_GROUP_KEYS)
