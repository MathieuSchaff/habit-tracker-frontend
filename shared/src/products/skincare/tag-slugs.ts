// Skincare Product Tag Slugs
// Tags applicable to skincare products.
// Categories: concern, skin_type, skin_zone, product_type_v2, texture,
//             routine_step_v2, routine_moment, skin_effect, sensation,
//             product_label, shared_label, actif_class.

export const SKINCARE_PRODUCT_TAG_SLUGS = {
  // Concerns
  // Functional (treat) — first 8
  ACNE_IMPERFECTIONS: 'acne-imperfections',
  ROUGEURS_VASCULAIRES: 'rougeurs-vasculaires',
  ECZEMA_ATOPIE: 'eczema-atopie',
  BARRIERE_CUTANEE: 'barriere-cutanee',
  HYPERPIGMENTATION: 'hyperpigmentation',
  // Slug suffixed to avoid collision with haircare 'reparation' (hair_effect).
  REPARATION: 'reparation-cutanee',
  KERATOSE_PILAIRE: 'keratose-pilaire',
  DESHYDRATATION: 'deshydratation',
  // Aesthetic (improve) — last 5
  ECLAT_TEINT: 'eclat-teint-uniforme',
  ANTI_AGE: 'anti-age',
  PORES_SEBUM: 'pores-sebum',
  CERNES_POCHES: 'cernes-poches',
  PROTECTION: 'protection',

  // Skin types
  PEAU_SECHE: 'peau-seche',
  PEAU_MIXTE: 'peau-mixte',
  PEAU_GRASSE: 'peau-grasse',
  PEAU_SENSIBLE: 'peau-sensible',
  PEAU_NORMALE: 'peau-normale',

  // Skin zones
  ZONE_VISAGE: 'zone-visage',
  ZONE_CORPS: 'zone-corps',
  ZONE_YEUX: 'zone-yeux',
  ZONE_LEVRES: 'zone-levres',
  ZONE_MAINS: 'zone-mains',
  ZONE_PIEDS: 'zone-pieds',

  // Product types V2 (functional, UI-facing)
  TYPE_NETTOYANT: 'type-nettoyant',
  TYPE_TONER: 'type-toner',
  TYPE_MIST: 'type-mist',
  TYPE_SERUM: 'type-serum',
  TYPE_HYDRATANT: 'type-hydratant',
  TYPE_MASQUE: 'type-masque',
  TYPE_EXFOLIATION: 'type-exfoliation',
  TYPE_SOLAIRE: 'type-solaire',
  TYPE_TRAITEMENT: 'type-traitement',
  TYPE_PRIMER: 'type-primer',
  TYPE_DEODORANT: 'type-deodorant',
  TYPE_OUTIL: 'type-outil',

  // Textures (physical format)
  TEXTURE_GEL: 'texture-gel',
  TEXTURE_CREME: 'texture-creme',
  TEXTURE_BAUME: 'texture-baume',
  TEXTURE_HUILE: 'texture-huile',
  TEXTURE_LAIT: 'texture-lait',
  TEXTURE_MOUSSE: 'texture-mousse',
  TEXTURE_EAU: 'texture-eau',
  TEXTURE_PATCH: 'texture-patch',
  TEXTURE_STICK: 'texture-stick',

  // Routine steps V2 (ordering, UI-facing)
  STEP_NETTOYAGE_1: 'step-nettoyage-1',
  STEP_NETTOYAGE_2: 'step-nettoyage-2',
  STEP_PREPARATION: 'step-preparation',
  STEP_TRAITEMENT: 'step-traitement',
  STEP_HYDRATATION: 'step-hydratation',
  STEP_OCCLUSIF: 'step-occlusif',
  STEP_PROTECTION_SOLAIRE: 'step-protection-solaire',

  // Routine moments (when to use)
  MOMENT_MATIN: 'moment-matin',
  MOMENT_SOIR: 'moment-soir',
  MOMENT_HEBDOMADAIRE: 'moment-hebdomadaire',
  MOMENT_USAGE_LOCALISE: 'moment-usage-localise',
  MOMENT_CRISE: 'moment-crise',

  // Skin effects (what the formula does)
  OCCLUSIF: 'occlusif',
  REPULPANT: 'repulpant',
  MATIFIANT: 'matifiant',
  PROTECTION_CUTANEE: 'protection-cutanee',
  ANTI_OXYDANT: 'anti-oxydant',
  APAISANT: 'apaisant',
  SEBO_REGULATEUR: 'sebo-regulateur',
  REPARATEUR: 'reparateur',
  PURIFIANT: 'purifiant',
  PREBIOTIQUE: 'prebiotique',
  KERATOLYTIQUE: 'keratolytique',

  // Sensations (how the formula feels)
  TEXTURE_RICHE: 'texture-riche',
  TEXTURE_LEGERE: 'texture-legere',
  NON_GRAS: 'non-gras',
  FINI_MAT: 'fini-mat',
  FINI_GLOWY: 'fini-glowy',
  ABSORPTION_RAPIDE: 'absorption-rapide',

  // Product labels
  SANS_PARFUM: 'sans-parfum',
  BIO_NATUREL: 'bio-naturel',
  VEGAN: 'vegan',
  CRUELTY_FREE: 'cruelty-free',
  HYPOALLERGENIQUE: 'hypoallergenique',
  PIGMENTS_VERTS: 'pigments-verts',
  SANS_SAVON: 'sans-savon',
  FILTRES_CHIMIQUES: 'filtres-chimiques',
  FILTRES_MINERAUX: 'filtres-mineraux',
  GROSSESSE_COMPATIBLE: 'grossesse-compatible',

  // Shared labels
  COMEDOGENE: 'comedogene',
  NON_COMEDOGENE: 'non-comedogene',

  // Actif class (pharmacological clusters)
  // Mirror of skincare ingredient actif_class slugs. Auto-derived at seed
  // time from a product's INCI via algo-derm normalize + substring match
  // (see backend/src/db/seed/utils/actif-class-detection.ts).
  RETINOIDS: 'retinoids',
  VITAMIN_C: 'vitamin-c',
  VITAMIN_E: 'vitamin-e',
  AHA: 'aha',
  BHA: 'bha',
  PHA: 'pha',
  ENZYMES_EXFOLIANTS: 'enzymes-exfoliants',
  CERAMIDES: 'ceramides',
  HYALURONIC_ACID: 'hyaluronic-acid',
  PEPTIDES: 'peptides',
  POLYPHENOLS: 'polyphenols',
  TYROSINASE_INHIBITORS: 'tyrosinase-inhibitors',
} as const

export type SkincareProductTagSlug =
  (typeof SKINCARE_PRODUCT_TAG_SLUGS)[keyof typeof SKINCARE_PRODUCT_TAG_SLUGS]
