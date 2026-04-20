export const SUPPLEMENT_INGREDIENT_TAG_SLUGS = {
  // Goals
  SOMMEIL: 'sommeil',
  ENERGIE: 'energie',
  COGNITION: 'cognition',
  MEMOIRE: 'memoire',
  FOCUS: 'focus',
  IMMUNITE: 'immunite',
  LONGEVITE: 'longevite',
  STRESS: 'stress',
  ANXIETE: 'anxiete',
  SPORT_PERFORMANCE: 'sport-performance',
  SPORT_RECUPERATION: 'sport-recuperation',
  ARTICULATIONS: 'articulations',
  DIGESTION: 'digestion',
  CARDIOVASCULAIRE: 'cardiovasculaire',
  HORMONAL: 'hormonal',
  OS: 'os',
  VISION: 'vision',
  DETOX: 'detox',
  PEAU_ORALE: 'peau-orale',
  CHEVEUX_ORALE: 'cheveux-orale',

  // Moment
  MATIN: 'matin',
  SOIR: 'soir',
  AVEC_REPAS: 'avec-repas',
  A_JEUN: 'a-jeun',
  PRE_ENTRAINEMENT: 'pre-entrainement',
  POST_ENTRAINEMENT: 'post-entrainement',

  // Restriction
  GROSSESSE_INCOMPATIBLE: 'grossesse-incompatible',
  ALLAITEMENT_INCOMPATIBLE: 'allaitement-incompatible',
  ENFANT_NON_ADAPTE: 'enfant-non-adapte',
  INTERACTION_ANTICOAGULANTS: 'interaction-anticoagulants',
  INSUFFISANCE_HEPATIQUE: 'insuffisance-hepatique',
  INSUFFISANCE_RENALE: 'insuffisance-renale',

  // Ingredient attribute (biochemical)
  ANTIOXYDANT: 'antioxydant',
  ADAPTOGENE: 'adaptogene',
  NOOTROPE: 'nootrope',
  ANTI_INFLAMMATOIRE: 'anti-inflammatoire',
  IMMUNO_MODULATEUR: 'immuno-modulateur',
  PRECURSEUR_NEUROTRANSMETTEUR: 'precurseur-neurotransmetteur',
  DONNEUR_METHYLE: 'donneur-methyle',
  COFACTEUR_ENZYMATIQUE: 'cofacteur-enzymatique',
  STIMULANT: 'stimulant',
  CALMANT: 'calmant',
} as const

export type SupplementIngredientTagSlug =
  (typeof SUPPLEMENT_INGREDIENT_TAG_SLUGS)[keyof typeof SUPPLEMENT_INGREDIENT_TAG_SLUGS]
