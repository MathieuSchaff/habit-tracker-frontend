import { buildProductTagTaxonomy } from '../../tag-taxonomy-builder'
import { DENTAL_PRODUCT_TAG_DEFS } from './tag-slugs'

export const DENTAL_PRODUCT_TAG_TAXONOMY = buildProductTagTaxonomy(DENTAL_PRODUCT_TAG_DEFS)
