import { INGREDIENT_SLUGS } from '../ingredient-slugs'
import type { IngredientTagMap } from '../../ingredient-tags'
import { TAG_SLUGS } from '../../tags'

export const haircareTagMap: IngredientTagMap = {
  [INGREDIENT_SLUGS.TETRASODIUM_EDTA]: {
    primary: [TAG_SLUGS.EXCIPIENT],
    secondary: [TAG_SLUGS.PEAU_TOUS_TYPES],
    avoid: [],
  },
  [INGREDIENT_SLUGS.HYDROXYETHYLCELLULOSE]: {
    primary: [TAG_SLUGS.EXCIPIENT],
    secondary: [TAG_SLUGS.PEAU_TOUS_TYPES],
    avoid: [],
  },
  [INGREDIENT_SLUGS.HYDROXYPROPYL_METHYLCELLULOSE]: {
    primary: [TAG_SLUGS.EXCIPIENT],
    secondary: [TAG_SLUGS.PEAU_TOUS_TYPES],
    avoid: [],
  },
  [INGREDIENT_SLUGS.SCLEROTIUM_GUM]: {
    primary: [TAG_SLUGS.EXCIPIENT],
    secondary: [TAG_SLUGS.PEAU_TOUS_TYPES],
    avoid: [],
  },
  [INGREDIENT_SLUGS.BEHENYL_ALCOHOL]: {
    primary: [TAG_SLUGS.EMOLLIENT, TAG_SLUGS.EXCIPIENT],
    secondary: [TAG_SLUGS.PEAU_SECHE, TAG_SLUGS.PEAU_TOUS_TYPES],
    avoid: [],
  },
  [INGREDIENT_SLUGS.DIMETHICONOL]: {
    primary: [TAG_SLUGS.EMOLLIENT, TAG_SLUGS.OCCLUSIF],
    secondary: [TAG_SLUGS.PEAU_SECHE],
    avoid: [],
  },
  [INGREDIENT_SLUGS.CYCLOPENTASILOXANE]: {
    primary: [TAG_SLUGS.EXCIPIENT, TAG_SLUGS.EMOLLIENT],
    secondary: [TAG_SLUGS.PEAU_TOUS_TYPES],
    avoid: [],
  },
  [INGREDIENT_SLUGS.PHENYL_TRIMETHICONE]: {
    primary: [TAG_SLUGS.EMOLLIENT, TAG_SLUGS.ECLAT],
    secondary: [TAG_SLUGS.PEAU_TOUS_TYPES],
    avoid: [],
  },

  [INGREDIENT_SLUGS.PIROCTONE_OLAMINE]: {
    primary: [TAG_SLUGS.ANTISEPTIQUE],
    secondary: [TAG_SLUGS.ANTI_ACNE],
    avoid: [],
  },

  // Coco Glucoside (Tensioactif doux dérivé de la coco)
  [INGREDIENT_SLUGS.COCO_GLUCOSIDE]: {
    primary: [TAG_SLUGS.TENSIOACTIF],
    secondary: [TAG_SLUGS.PEAU_SENSIBLE, TAG_SLUGS.NON_COMEDOGENE],
    avoid: [],
  },

  // Decyl Glucoside (Tensioactif très doux)
  [INGREDIENT_SLUGS.DECYL_GLUCOSIDE]: {
    primary: [TAG_SLUGS.TENSIOACTIF],
    secondary: [TAG_SLUGS.PEAU_ATOPIQUE],
    avoid: [],
  },

  // Sodium Cocoyl Isethionate (Nettoyant crémeux doux)
  [INGREDIENT_SLUGS.SODIUM_COCOYL_ISETHIONATE]: {
    primary: [TAG_SLUGS.TENSIOACTIF],
    secondary: [TAG_SLUGS.PEAU_SECHE, TAG_SLUGS.PEAU_NORMALE],
    avoid: [],
  },
}
