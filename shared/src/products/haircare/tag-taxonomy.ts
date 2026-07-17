import { buildProductTagTaxonomy } from '../../tag-taxonomy-builder'
import { HAIRCARE_PRODUCT_TAG_DEFS } from './tag-slugs'

export const HAIRCARE_PRODUCT_TAG_TAXONOMY = buildProductTagTaxonomy(HAIRCARE_PRODUCT_TAG_DEFS)
