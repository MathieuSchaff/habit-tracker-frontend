import type { IngredientTagMap } from '../../ingredient-tags'
import { SKINCARE_INGREDIENT_TAG_SLUGS } from '../../tags'
import { INGREDIENT_SLUGS } from '../ingredient-slugs'

// Skeleton: the curated ingredient→tag associations were removed (the links
// live in the SQL snapshot). One entry is kept as a shape example — key by an
// ingredient slug, list ingredient-scoped tag slugs in primary/secondary/avoid.
export const skincareTagMap: IngredientTagMap = {
  [INGREDIENT_SLUGS.SODIUM_HYALURONATE_CROSSPOLYMER]: {
    primary: [
      SKINCARE_INGREDIENT_TAG_SLUGS.REPULPANT,
      SKINCARE_INGREDIENT_TAG_SLUGS.GRAIN_PEAU,
      SKINCARE_INGREDIENT_TAG_SLUGS.ANTI_AGE,
    ],
    secondary: [],
    avoid: [],
  },
}
