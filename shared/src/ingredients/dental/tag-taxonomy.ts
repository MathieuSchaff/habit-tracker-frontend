import { buildTagCategoryMap, buildTagLabels } from '../../tag-api/tag-taxonomy-builder'
import { DENTAL_INGREDIENT_TAG_DEFS } from './tag-slugs'

export const DENTAL_INGREDIENT_TAG_TAXONOMY = buildTagCategoryMap(DENTAL_INGREDIENT_TAG_DEFS)
export const DENTAL_INGREDIENT_TAG_LABELS = buildTagLabels(DENTAL_INGREDIENT_TAG_DEFS)
