import { buildTagCategoryMap } from '../../tag-api/tag-taxonomy-builder'
import { SKINCARE_INGREDIENT_TAG_DEFS } from './tag-slugs'

export const SKINCARE_INGREDIENT_TAG_TAXONOMY = buildTagCategoryMap(SKINCARE_INGREDIENT_TAG_DEFS)
