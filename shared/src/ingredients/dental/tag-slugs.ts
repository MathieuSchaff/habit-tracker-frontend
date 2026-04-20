export const DENTAL_INGREDIENT_TAG_SLUGS = {
  // Concerns
  CARIE: 'carie',
  SENSIBILITE_DENTINAIRE: 'sensibilite-dentinaire',
  GENCIVITE: 'gencivite',
  PARODONTITE: 'parodontite',
  PLAQUE: 'plaque',
  TARTRE: 'tartre',
  TACHES: 'taches',
  EROSION_ACIDE: 'erosion-acide',
  HALITOSE: 'halitose',
  BRUXISME: 'bruxisme',
  APHTES: 'aphtes',

  // Age group
  ADULTE: 'adulte',
  ENFANT: 'enfant',
  SENIOR: 'senior',
  ORTHODONTIE: 'orthodontie',
  IMPLANTS: 'implants',
  DENTS_LAIT: 'dents-lait',

  // Ingredient attribute (biochemical)
  REMINERALISANT: 'remineralisant',
  ANTIBACTERIEN: 'antibacterien',
  ANTI_PLAQUE: 'anti-plaque',
  ANTI_TARTRE: 'anti-tartre',
  ABRASIF_DOUX: 'abrasif-doux',
  ABRASIF_FORT: 'abrasif-fort',
  BLANCHISSANT: 'blanchissant',
  NEUTRALISANT_ACIDE: 'neutralisant-acide',
  FLUORURE: 'fluorure',
  DESENSIBILISANT: 'desensibilisant',
  ANTI_INFLAMMATOIRE: 'anti-inflammatoire',

  // Dental effect
  FRAICHEUR: 'fraicheur',
  BLANCHEUR: 'blancheur',
  APAISEMENT_GENCIVES: 'apaisement-gencives',
  RENFORCEMENT_EMAIL: 'renforcement-email',
  REDUCTION_SENSIBILITE: 'reduction-sensibilite',
} as const

export type DentalIngredientTagSlug =
  (typeof DENTAL_INGREDIENT_TAG_SLUGS)[keyof typeof DENTAL_INGREDIENT_TAG_SLUGS]
