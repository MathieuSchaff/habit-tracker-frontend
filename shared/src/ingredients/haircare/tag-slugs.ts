export const HAIRCARE_INGREDIENT_TAG_SLUGS = {
  // Concerns
  PELLICULES: 'pellicules',
  CHUTE: 'chute',
  CASSE: 'casse',
  FOURCHES: 'fourches',
  FRISOTTIS: 'frisottis',
  MANQUE_VOLUME: 'manque-volume',
  CHEVEUX_SECS: 'cheveux-secs',
  CHEVEUX_GRAS: 'cheveux-gras',
  CUIR_CHEVELU_SENSIBLE: 'cuir-chevelu-sensible',
  CUIR_CHEVELU_IRRITE: 'cuir-chevelu-irrite',
  ALOPECIE: 'alopecie',
  POST_COLORATION: 'post-coloration',
  CHEVEUX_TERNES: 'cheveux-ternes',
  JAUNISSEMENT_BLOND: 'jaunissement-blond',
  POROSITE_EXCESSIVE: 'porosite-excessive',
  POINTES_SECHES: 'pointes-seches',

  // Hair type
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

  // Ingredient attribute (biochemical)
  HUMECTANT: 'humectant',
  EMOLLIENT: 'emollient',
  PROTEINE: 'proteine',
  FILM_PROTECTEUR: 'film-protecteur',
  TENSIOACTIF_DOUX: 'tensioactif-doux',
  CHELATEUR: 'chelateur',
  ANTI_PELLICULAIRE: 'anti-pelliculaire',
  STIMULANT_FOLLICULE: 'stimulant-follicule',
  CONDITIONNEUR_CATIONIQUE: 'conditionneur-cationique',
  GAINANT: 'gainant',

  // Hair effect
  BRILLANCE: 'brillance',
  DOUCEUR: 'douceur',
  VOLUME: 'volume',
  DISCIPLINE: 'discipline',
  HYDRATATION: 'hydratation',
  NUTRITION: 'nutrition',
  LISSANT: 'lissant',
  FIXATION: 'fixation',
  DEFINITION_BOUCLES: 'definition-boucles',
  GAINAGE: 'gainage',
} as const

export type HaircareIngredientTagSlug =
  (typeof HAIRCARE_INGREDIENT_TAG_SLUGS)[keyof typeof HAIRCARE_INGREDIENT_TAG_SLUGS]
