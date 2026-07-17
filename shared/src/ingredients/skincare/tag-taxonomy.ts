import { buildTagCategoryMap, buildTagLabels } from '../../tag-taxonomy-builder'
import { SKINCARE_INGREDIENT_TAG_DEFS } from './tag-slugs'

export const SKINCARE_INGREDIENT_TAG_TAXONOMY = buildTagCategoryMap(SKINCARE_INGREDIENT_TAG_DEFS)
export const SKINCARE_INGREDIENT_TAG_LABELS = buildTagLabels(SKINCARE_INGREDIENT_TAG_DEFS)
