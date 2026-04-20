// Skincare Ingredient Tag Slugs
// Tags applicable to skincare/haircare/dental ingredients.
// Categories: concern, skin_type, ingredient_attribute, skin_effect, shared_label.

export const SKINCARE_INGREDIENT_TAG_SLUGS = {
  // Concerns
  ANTI_ROUGEURS: 'anti-rougeurs',
  ROSACEE: 'rosacee',
  COUPEROSE: 'couperose',
  FLUSHS: 'flushs',
  BARRIERE_CUTANEE: 'barriere-cutanee',
  ANTI_TACHES: 'anti-taches',
  ANTI_ACNE: 'anti-acne',
  ANTI_AGE: 'anti-age',
  HYPERPIGMENTATION: 'hyperpigmentation',
  DESHYDRATATION: 'deshydratation',
  PORES_DILATES: 'pores-dilates',
  CERNES_POCHES: 'cernes-poches',
  BRILLANCE: 'brillance',
  ECLAT: 'eclat',
  POST_ACNE: 'post-acne',
  CICATRISATION: 'cicatrisation',
  MICROBIOME: 'microbiome',
  PHOTO_VIEILLISSEMENT: 'photo-vieillissement',
  TEINT_TERNE: 'teint-terne',
  LUMIERE_BLEUE: 'lumiere-bleue',
  POLLUTION: 'pollution',
  ECZEMA: 'eczema',
  GRAIN_PEAU: 'grain-peau',
  KERATOSE_PILAIRE: 'keratose-pilaire',
  PHOTO_PROTECTION: 'photo-protection',
  BARRIERE_CUTANEE_ALTEREE: 'barriere-cutanee-alteree',

  // Skin types
  PEAU_SECHE: 'peau-seche',
  PEAU_MIXTE: 'peau-mixte',
  PEAU_GRASSE: 'peau-grasse',
  PEAU_REACTIVE: 'peau-reactive',
  PEAU_SENSIBLE: 'peau-sensible',
  PEAU_NORMALE: 'peau-normale',
  PEAU_ATOPIQUE: 'peau-atopique',
  PEAU_RUGUEUSE: 'peau-rugueuse',
  PEAU_TOUS_TYPES: 'tous-types',

  // Ingredient attributes
  ANTI_OXYDANT: 'anti-oxydant',
  HUMECTANT: 'humectant',
  EMOLLIENT: 'emollient',
  REPARATEUR: 'reparateur',
  ANTISEPTIQUE: 'antiseptique',
  KERATOLYTIQUE: 'keratolytique',
  SEBO_REGULATEUR: 'sebo-regulateur',
  ASTRINGENT: 'astringent',
  ANTI_BACTERIEN: 'anti-bacterien',
  BIOMIMETIQUE: 'biomimetique',
  APAISANT: 'apaisant',
  PREBIOTIQUE: 'prebiotique',
  ANTI_INFLAMMATOIRE: 'anti-inflammatoire',
  PURIFIANT: 'purifiant',
  FILTRE_UV: 'filtre-uv',
  TENSIOACTIF: 'tensioactif',
  EXCIPIENT: 'excipient',
  ACTIF: 'actif',

  // Skin effects (both-scoped: also apply to molecules)
  OCCLUSIF: 'occlusif',
  REPULPANT: 'repulpant',
  MATIFIANT: 'matifiant',
  PROTECTION_CUTANEE: 'protection-cutanee',

  // UV filter subtype — describes the filter nature of a sunscreen
  // molecule (chemical vs. mineral). Shared with product tags.
  FILTRES_CHIMIQUES: 'filtres-chimiques',
  FILTRES_MINERAUX: 'filtres-mineraux',

  // Shared labels
  COMEDOGENE: 'comedogene',
  NON_COMEDOGENE: 'non-comedogene',
  // Contra-indication flag — used in `avoid:` arrays on retinoids and
  // other pregnancy-restricted actives.
  GROSSESSE_COMPATIBLE: 'grossesse-compatible',
} as const

export type SkincareIngredientTagSlug =
  (typeof SKINCARE_INGREDIENT_TAG_SLUGS)[keyof typeof SKINCARE_INGREDIENT_TAG_SLUGS]
