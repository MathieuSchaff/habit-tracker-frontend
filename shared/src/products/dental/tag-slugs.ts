export const DENTAL_PRODUCT_TAG_SLUGS = {
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

  // Product type
  // Slugs shared with SKINCARE_PRODUCT_TAG_SLUGS — same DB rows, dental
  // taxonomy references them to drive the dental filter drawer.
  DENTIFRICE: 'dentifrice',
  BAIN_DE_BOUCHE: 'bain-de-bouche',
  BLANCHIMENT_DENTAIRE: 'blanchiment-dentaire',
  FIL_DENTAIRE: 'fil-dentaire',

  // Dental effects
  FRAICHEUR: 'fraicheur',
  BLANCHEUR: 'blancheur',
  APAISEMENT_GENCIVES: 'apaisement-gencives',
  RENFORCEMENT_EMAIL: 'renforcement-email',
  REDUCTION_SENSIBILITE: 'reduction-sensibilite',

  // Product labels
  // Shared with skincare — no new DB rows, taxonomy reference only.
  SANS_PARFUM: 'sans-parfum',
  BIO_NATUREL: 'bio-naturel',
  VEGAN: 'vegan',
  CRUELTY_FREE: 'cruelty-free',
  HYPOALLERGENIQUE: 'hypoallergenique',
  GROSSESSE_COMPATIBLE: 'grossesse-compatible',
  // Dental-specific labels — new DB rows.
  SANS_FLUOR: 'sans-fluor',
  SANS_ALCOOL: 'sans-alcool',
  SANS_SLS: 'sans-sls',
} as const

export type DentalProductTagSlug =
  (typeof DENTAL_PRODUCT_TAG_SLUGS)[keyof typeof DENTAL_PRODUCT_TAG_SLUGS]
