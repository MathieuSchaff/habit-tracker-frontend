import { buildProductTagTaxonomy, buildTagSubgroups } from '../../tag-taxonomy-builder'
import { SKINCARE_PRODUCT_TAG_DEFS, type SkincareProductTagSlug } from './tag-slugs'

export const SKINCARE_PRODUCT_TAG_TAXONOMY = buildProductTagTaxonomy(SKINCARE_PRODUCT_TAG_DEFS)

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
export const SKINCARE_CONCERN_SLUGS: ReadonlySet<SkincareProductTagSlug> = new Set(
  SKINCARE_PRODUCT_TAG_DEFS.filter(({ category }) => category === 'concern').map(({ slug }) => slug)
)

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
