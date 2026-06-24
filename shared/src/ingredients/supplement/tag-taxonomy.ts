import { buildTagCategoryMap, buildTagLabels } from '../../tag-api/tag-taxonomy-builder'
import { SUPPLEMENT_INGREDIENT_TAG_DEFS } from './tag-slugs'

export const SUPPLEMENT_INGREDIENT_TAG_TAXONOMY = buildTagCategoryMap(
  SUPPLEMENT_INGREDIENT_TAG_DEFS
)
export const SUPPLEMENT_INGREDIENT_TAG_LABELS = buildTagLabels(SUPPLEMENT_INGREDIENT_TAG_DEFS)
