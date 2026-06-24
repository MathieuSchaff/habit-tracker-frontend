import { buildTagCategoryMap } from '../../tag-api/tag-taxonomy-builder'
import { DENTAL_INGREDIENT_TAG_DEFS } from './tag-slugs'

export const DENTAL_INGREDIENT_TAG_TAXONOMY = buildTagCategoryMap(DENTAL_INGREDIENT_TAG_DEFS)
