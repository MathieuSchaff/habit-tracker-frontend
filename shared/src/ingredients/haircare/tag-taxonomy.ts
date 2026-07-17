import { buildTagCategoryMap, buildTagLabels } from '../../tag-taxonomy-builder'
import { HAIRCARE_INGREDIENT_TAG_DEFS } from './tag-slugs'

export const HAIRCARE_INGREDIENT_TAG_TAXONOMY = buildTagCategoryMap(HAIRCARE_INGREDIENT_TAG_DEFS)
export const HAIRCARE_INGREDIENT_TAG_LABELS = buildTagLabels(HAIRCARE_INGREDIENT_TAG_DEFS)
