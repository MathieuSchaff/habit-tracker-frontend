// Supplement Product Tag Slugs
// Tags applicable to supplement (complément) products.
// Categories: goal, moment, restriction, product_type, product_label.
//
// goal / restriction : slugs alignés sur SUPPLEMENT_INGREDIENT_TAG_SLUGS quand
// applicable (rows DB indépendantes ingredient vs product). Quelques nouveaux
// slugs product-only (spec §4.5) : `peau-cheveux-ongles`, `stress-anxiete`,
// `recuperation-musculaire`, `autour-sport`, `interaction-thyroide`.
//
// `matin-supplement` / `soir-supplement` : suffixés pour éviter la collision DB
// avec les slugs skincare (routine_step.matin, routine_step.soir) — même
// raison que haircare `brillance-cheveux` / `hydratation-cheveux`.
//
// product_type : récupère les 5 slugs historiquement placés dans
// SKINCARE_PRODUCT_TAG_SLUGS (gelule, capsule, poudre, sirop, gummy) et en
// ajoute 4 nouveaux (comprime, ampoule-buvable, huile-orale, spray-sublingual).

export const SUPPLEMENT_PRODUCT_TAG_SLUGS = {
  // Goals
  SOMMEIL: 'sommeil',
  ENERGIE: 'energie',
  COGNITION: 'cognition',
  IMMUNITE: 'immunite',
  PEAU_CHEVEUX_ONGLES: 'peau-cheveux-ongles',
  DIGESTION: 'digestion',
  STRESS_ANXIETE: 'stress-anxiete',
  RECUPERATION_MUSCULAIRE: 'recuperation-musculaire',
  LONGEVITE: 'longevite',
  HORMONAL: 'hormonal',

  // Moment
  // Suffixed `MATIN_SUPPLEMENT` / `SOIR_SUPPLEMENT` keep distinct DB slug
  // values vs `SUPPLEMENT_INGREDIENT_TAG_SLUGS.MATIN` (same display, distinct
  // row — same pattern as haircare `brillance-cheveux`).
  MATIN_SUPPLEMENT: 'matin-supplement',
  SOIR_SUPPLEMENT: 'soir-supplement',
  AVEC_REPAS: 'avec-repas',
  A_JEUN: 'a-jeun',
  AUTOUR_SPORT: 'autour-sport',

  // Restriction
  GROSSESSE_INCOMPATIBLE: 'grossesse-incompatible',
  ALLAITEMENT_INCOMPATIBLE: 'allaitement-incompatible',
  INTERACTION_ANTICOAGULANTS: 'interaction-anticoagulants',
  INTERACTION_THYROIDE: 'interaction-thyroide',

  // Product types
  GELULE: 'gelule',
  CAPSULE: 'capsule',
  COMPRIME: 'comprime',
  AMPOULE_BUVABLE: 'ampoule-buvable',
  POUDRE: 'poudre',
  SIROP: 'sirop',
  GUMMY: 'gummy',
  HUILE_ORALE: 'huile-orale',
  SPRAY_SUBLINGUAL: 'spray-sublingual',

  // Product labels
  SANS_GLUTEN: 'sans-gluten',
  SANS_LACTOSE: 'sans-lactose',
  BIO: 'bio',
  FABRICATION_FR: 'fabrication-fr',
  EXTRAIT_TITRE: 'extrait-titre',
  DOSE_CLINIQUE: 'dose-clinique',
} as const

export type SupplementProductTagSlug =
  (typeof SUPPLEMENT_PRODUCT_TAG_SLUGS)[keyof typeof SUPPLEMENT_PRODUCT_TAG_SLUGS]
