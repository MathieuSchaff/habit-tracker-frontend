// Dental Product Tag Slugs
// Tags applicable to dental products.
// Categories: concern, age_group, product_type, dental_effect, product_label.
//
// concern / age_group / dental_effect : slugs alignés sur
// DENTAL_INGREDIENT_TAG_SLUGS quand le sens est partagé (rows DB indépendantes,
// scope `both` déduit — cohérence cross-entité, même pattern que skincare).
// product_type / product_label : slugs nouveaux scope produit.
//
// Note `gencivite` / `taches` : orthographe préservée pour aligner avec les
// ingredient slugs existants (typo `gencivite` vs correct `gingivite` à
// harmoniser plus tard, hors scope de l'étape §4.5).

export const DENTAL_PRODUCT_TAG_SLUGS = {
  // Concerns
  CARIE: 'carie',
  SENSIBILITE_DENTINAIRE: 'sensibilite-dentinaire',
  HALITOSE: 'halitose',
  GENCIVITE: 'gencivite',
  PLAQUE: 'plaque',
  TACHES: 'taches',
  TARTRE: 'tartre',
  EMAIL_AFFAIBLI: 'email-affaibli',
  SECHERESSE_BUCCALE: 'secheresse-buccale',

  // Age group
  ADULTE: 'adulte',
  ENFANT: 'enfant',
  ADO: 'ado',
  ORTHODONTIE: 'orthodontie',
  SENIOR: 'senior',

  // Product types
  DENTIFRICE: 'dentifrice',
  BAIN_DE_BOUCHE: 'bain-de-bouche',
  FIL_DENTAIRE: 'fil-dentaire',
  BROSSETTE: 'brossette',
  KIT_BLANCHIMENT: 'kit-blanchiment',

  // Dental effect
  FRAICHEUR: 'fraicheur',
  BLANCHEUR: 'blancheur',
  RENFORCEMENT_EMAIL: 'renforcement-email',
  ANTI_PLAQUE: 'anti-plaque',
  REMINERALISATION: 'remineralisation',
  APAISEMENT_GENCIVES: 'apaisement-gencives',

  // Product labels
  SANS_FLUOR: 'sans-fluor',
  SANS_SLS: 'sans-sls',
  SANS_EDULCORANTS_ARTIFICIELS: 'sans-edulcorants-artificiels',
  VEGAN: 'vegan',
  BIO: 'bio',
} as const

export type DentalProductTagSlug =
  (typeof DENTAL_PRODUCT_TAG_SLUGS)[keyof typeof DENTAL_PRODUCT_TAG_SLUGS]
