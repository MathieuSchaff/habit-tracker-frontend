// Haircare Product Tag Slugs
// Tags applicable to haircare products.
// Categories: concern, hair_type, product_type, routine_step,
//             hair_effect, product_label.
//
// concern / hair_type / hair_effect : slugs alignés sur
// HAIRCARE_INGREDIENT_TAG_SLUGS (rows DB indépendantes mais slug commun
// → cohérence cross-entité, comme côté skincare).
// product_type / routine_step / product_label : slugs nouveaux, scope produit.

export const HAIRCARE_PRODUCT_TAG_SLUGS = {
  // Concerns
  PELLICULES: 'pellicules',
  CHUTE: 'chute',
  CASSE: 'casse',
  FOURCHES: 'fourches',
  MANQUE_VOLUME: 'manque-volume',
  CHEVEUX_SECS: 'cheveux-secs',
  CHEVEUX_GRAS: 'cheveux-gras',
  RACINES_GRASSES: 'racines-grasses',
  CUIR_CHEVELU_SENSIBLE: 'cuir-chevelu-sensible',
  CUIR_CHEVELU_IRRITE: 'cuir-chevelu-irrite',
  ALOPECIE: 'alopecie',
  POST_COLORATION: 'post-coloration',
  CHEVEUX_TERNES: 'cheveux-ternes',
  JAUNISSEMENT_BLOND: 'jaunissement-blond',
  POROSITE_EXCESSIVE: 'porosite-excessive',
  POINTES_SECHES: 'pointes-seches',

  // Hair types
  LISSES: 'lisses',
  ONDULES: 'ondules',
  BOUCLES: 'boucles',
  CREPUS: 'crepus',
  FINS: 'fins',
  EPAIS: 'epais',
  MOYENS: 'moyens',
  COLORES: 'colores',
  DECOLORES: 'decolores',
  NATURELS: 'naturels',
  CHEVEUX_TOUS_TYPES: 'cheveux-tous-types',

  // Product types
  SHAMPOOING: 'shampooing',
  SHAMPOOING_SEC: 'shampooing-sec',
  SHAMPOOING_CLARIFIANT: 'shampooing-clarifiant',
  CO_WASH: 'co-wash',
  APRES_SHAMPOOING: 'apres-shampooing',
  MASQUE_CAPILLAIRE: 'masque-capillaire',
  SOIN_PROFOND: 'soin-profond',
  SERUM_CAPILLAIRE: 'serum-capillaire',
  HUILE_CAPILLAIRE: 'huile-capillaire',
  LEAVE_IN: 'leave-in',
  LOTION_FORTIFIANTE: 'lotion-fortifiante',
  GEL_COIFFANT: 'gel-coiffant',
  MOUSSE_COIFFANTE: 'mousse-coiffante',
  CREME_COIFFANTE: 'creme-coiffante',
  SPRAY_COIFFANT: 'spray-coiffant',
  SPRAY_THERMOPROTECTEUR: 'spray-thermoprotecteur',
  CIRE_COIFFANTE: 'cire-coiffante',

  // Routine step
  PRE_SHAMPOOING: 'pre-shampooing',
  LAVAGE: 'lavage',
  CONDITIONNEMENT: 'conditionnement',
  MASQUE_HEBDO_CHEVEUX: 'masque-hebdo-cheveux',
  TRAITEMENT_CUIR_CHEVELU: 'traitement-cuir-chevelu',
  SOIN_SANS_RINCAGE: 'soin-sans-rincage',
  COIFFAGE: 'coiffage',
  FINITION: 'finition',

  // Hair effect
  // `brillance` / `hydratation` renommés -cheveux pour éviter la collision DB
  // avec les slugs skincare (concern.brillance, routine_step.hydratation) —
  // product_tags.slug est UNIQUE, pas (slug, tagType).
  BRILLANCE: 'brillance-cheveux',
  DOUCEUR: 'douceur',
  VOLUME: 'volume',
  DISCIPLINE: 'discipline',
  HYDRATATION: 'hydratation-cheveux',
  NUTRITION: 'nutrition',
  LISSANT: 'lissant',
  FIXATION: 'fixation',
  DEFINITION_BOUCLES: 'definition-boucles',
  GAINAGE: 'gainage',
  ANTI_FRISOTTIS: 'anti-frisottis',
  DEMELAGE: 'demelage',
  REPARATION: 'reparation',
  THERMOPROTECTION: 'thermoprotection',

  // Product labels
  SANS_SULFATES: 'sans-sulfates',
  SANS_SILICONES: 'sans-silicones',
  CGM_FRIENDLY: 'cgm-friendly',
} as const

export type HaircareProductTagSlug =
  (typeof HAIRCARE_PRODUCT_TAG_SLUGS)[keyof typeof HAIRCARE_PRODUCT_TAG_SLUGS]
