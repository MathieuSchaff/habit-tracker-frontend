import { buildTagCategoryMap } from '../../tag-api/tag-taxonomy-builder'
import { HAIRCARE_INGREDIENT_TAG_DEFS } from './tag-slugs'

export const HAIRCARE_INGREDIENT_TAG_TAXONOMY = buildTagCategoryMap(HAIRCARE_INGREDIENT_TAG_DEFS)
