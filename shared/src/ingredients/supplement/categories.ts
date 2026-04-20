// Supplement Categories
// Functional classification for compléments alimentaires (oral supplements).
// Distinct from SKINCARE_INGREDIENT_CATEGORIES (which classifies skincare ingredients
// by formulation role: actif, humectant, émollient, etc.).

export const SUPPLEMENT_CATEGORIES = {
  VITAMINE: 'vitamine',
  MINERAL: 'mineral',
  ACIDE_AMINE: 'acide-amine',
  ACIDE_GRAS: 'acide-gras',
  ANTIOXYDANT: 'antioxydant',
  CAROTENOIDE: 'carotenoide',
  PLANTE: 'plante',
  ADAPTOGENE: 'adaptogene',
  CHAMPIGNON: 'champignon',
  PROBIOTIQUE: 'probiotique',
  PREBIOTIQUE: 'prebiotique',
  PEPTIDE: 'peptide',
  COLLAGENE: 'collagene',
  POLYPHENOL: 'polyphenol',
  NEUROACTIF: 'neuroactif',
  LONGEVITE: 'longevite',
  ENZYME: 'enzyme',
  AUTRE: 'autre',
} as const

export type SupplementCategory = (typeof SUPPLEMENT_CATEGORIES)[keyof typeof SUPPLEMENT_CATEGORIES]

// For Zod enum validation
export const SUPPLEMENT_CATEGORY_VALUES = Object.values(SUPPLEMENT_CATEGORIES) as [
  SupplementCategory,
  ...SupplementCategory[],
]
