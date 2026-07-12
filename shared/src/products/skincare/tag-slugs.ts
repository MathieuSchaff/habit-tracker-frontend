// Skincare Product Tag definitions — single source of truth.
// One {key, slug, label, category[, subgroup]} per tag, in DISPLAY order; the
// legacy *_TAG_SLUGS object, labels, taxonomy and the concern/characteristic
// display sub-groups (tag-taxonomy.ts) are all derived from this array.
// Categories: concern, skin_type, skin_zone, product_type_v2, texture,
//             routine_step_v2, routine_moment, skin_effect, sensation,
//             product_characteristic, actif_class.

import { SHARED_SKINCARE_ACTIF_CLASS_DEFS } from '../../ingredients/skincare/tag-slugs'
import { deriveTagSlugs, type ProductTagDef } from '../../tag-api/tag-taxonomy-builder'

export const SKINCARE_PRODUCT_TAG_CATEGORIES = [
  'concern',
  'skin_type',
  'skin_zone',
  'product_type_v2',
  'texture',
  'routine_step_v2',
  'routine_moment',
  'skin_effect',
  'sensation',
  'product_characteristic',
  'actif_class',
] as const

export type SkincareProductTagCategory = (typeof SKINCARE_PRODUCT_TAG_CATEGORIES)[number]

export const SKINCARE_PRODUCT_TAG_DEFS = [
  // Concerns — functional (treat)
  {
    key: 'ACNE_IMPERFECTIONS',
    slug: 'acne-imperfections',
    label: 'Acné / Imperfections',
    category: 'concern',
    subgroup: 'functional',
  },
  {
    key: 'ROUGEURS_VASCULAIRES',
    slug: 'rougeurs-vasculaires',
    label: 'Rougeurs',
    category: 'concern',
    subgroup: 'functional',
  },
  {
    key: 'ECZEMA_ATOPIE',
    slug: 'eczema-atopie',
    label: 'Eczéma / Atopie',
    category: 'concern',
    subgroup: 'functional',
  },
  {
    key: 'BARRIERE_CUTANEE',
    slug: 'barriere-cutanee',
    label: 'Barrière cutanée',
    category: 'concern',
    subgroup: 'functional',
  },
  {
    key: 'HYPERPIGMENTATION',
    slug: 'hyperpigmentation',
    label: 'Hyperpigmentation',
    category: 'concern',
    subgroup: 'functional',
  },
  // Slug suffixed to avoid collision with haircare 'reparation' (hair_effect).
  {
    key: 'REPARATION',
    slug: 'reparation-cutanee',
    label: 'Réparation',
    category: 'concern',
    subgroup: 'functional',
  },
  {
    key: 'KERATOSE_PILAIRE',
    slug: 'keratose-pilaire',
    label: 'Kératose pilaire',
    category: 'concern',
    subgroup: 'functional',
  },
  {
    key: 'DESHYDRATATION',
    slug: 'deshydratation',
    label: 'Déshydratation',
    category: 'concern',
    subgroup: 'functional',
  },
  // Concerns — aesthetic (improve)
  {
    key: 'ECLAT_TEINT',
    slug: 'eclat-teint-uniforme',
    label: 'Éclat / Teint uniforme',
    category: 'concern',
    subgroup: 'aesthetic',
  },
  {
    key: 'ANTI_AGE',
    slug: 'anti-age',
    label: 'Anti-âge',
    category: 'concern',
    subgroup: 'aesthetic',
  },
  {
    key: 'PORES_SEBUM',
    slug: 'pores-sebum',
    label: 'Pores / Sébum',
    category: 'concern',
    subgroup: 'aesthetic',
  },
  {
    key: 'CERNES_POCHES',
    slug: 'cernes-poches',
    label: 'Cernes et poches',
    category: 'concern',
    subgroup: 'aesthetic',
  },
  {
    key: 'PROTECTION',
    slug: 'protection',
    label: 'Protection',
    category: 'concern',
    subgroup: 'aesthetic',
  },

  // Skin types
  { key: 'PEAU_SECHE', slug: 'peau-seche', label: 'Peau sèche', category: 'skin_type' },
  { key: 'PEAU_MIXTE', slug: 'peau-mixte', label: 'Peau mixte', category: 'skin_type' },
  { key: 'PEAU_GRASSE', slug: 'peau-grasse', label: 'Peau grasse', category: 'skin_type' },
  { key: 'PEAU_SENSIBLE', slug: 'peau-sensible', label: 'Peau sensible', category: 'skin_type' },
  { key: 'PEAU_NORMALE', slug: 'peau-normale', label: 'Peau normale', category: 'skin_type' },

  // Skin zones
  { key: 'ZONE_VISAGE', slug: 'zone-visage', label: 'Visage', category: 'skin_zone' },
  { key: 'ZONE_CORPS', slug: 'zone-corps', label: 'Corps', category: 'skin_zone' },
  { key: 'ZONE_YEUX', slug: 'zone-yeux', label: 'Yeux', category: 'skin_zone' },
  { key: 'ZONE_LEVRES', slug: 'zone-levres', label: 'Lèvres', category: 'skin_zone' },
  { key: 'ZONE_MAINS', slug: 'zone-mains', label: 'Mains', category: 'skin_zone' },
  { key: 'ZONE_PIEDS', slug: 'zone-pieds', label: 'Pieds', category: 'skin_zone' },

  // Product types V2 (functional, UI-facing)
  {
    key: 'TYPE_NETTOYANT',
    slug: 'type-nettoyant',
    label: 'Nettoyant',
    category: 'product_type_v2',
  },
  { key: 'TYPE_TONER', slug: 'type-toner', label: 'Toner / Essence', category: 'product_type_v2' },
  { key: 'TYPE_MIST', slug: 'type-mist', label: 'Mist / Brume', category: 'product_type_v2' },
  {
    key: 'TYPE_SERUM',
    slug: 'type-serum',
    label: 'Sérum / Concentré',
    category: 'product_type_v2',
  },
  {
    key: 'TYPE_HYDRATANT',
    slug: 'type-hydratant',
    label: 'Hydratant',
    category: 'product_type_v2',
  },
  { key: 'TYPE_MASQUE', slug: 'type-masque', label: 'Masque', category: 'product_type_v2' },
  {
    key: 'TYPE_EXFOLIATION',
    slug: 'type-exfoliation',
    label: 'Exfoliant',
    category: 'product_type_v2',
  },
  {
    key: 'TYPE_SOLAIRE',
    slug: 'type-solaire',
    label: 'Protection solaire',
    category: 'product_type_v2',
  },
  {
    key: 'TYPE_TRAITEMENT',
    slug: 'type-traitement',
    label: 'Traitement ciblé',
    category: 'product_type_v2',
  },
  {
    key: 'TYPE_PRIMER',
    slug: 'type-primer',
    label: 'Base de maquillage',
    category: 'product_type_v2',
  },
  {
    key: 'TYPE_DEODORANT',
    slug: 'type-deodorant',
    label: 'Déodorant',
    category: 'product_type_v2',
  },

  // Textures (physical format)
  { key: 'TEXTURE_GEL', slug: 'texture-gel', label: 'Gel', category: 'texture' },
  { key: 'TEXTURE_CREME', slug: 'texture-creme', label: 'Crème', category: 'texture' },
  { key: 'TEXTURE_BAUME', slug: 'texture-baume', label: 'Baume', category: 'texture' },
  { key: 'TEXTURE_HUILE', slug: 'texture-huile', label: 'Huile', category: 'texture' },
  { key: 'TEXTURE_LAIT', slug: 'texture-lait', label: 'Lait', category: 'texture' },
  { key: 'TEXTURE_MOUSSE', slug: 'texture-mousse', label: 'Mousse', category: 'texture' },
  { key: 'TEXTURE_EAU', slug: 'texture-eau', label: 'Eau', category: 'texture' },
  { key: 'TEXTURE_PATCH', slug: 'texture-patch', label: 'Patch', category: 'texture' },
  { key: 'TEXTURE_STICK', slug: 'texture-stick', label: 'Stick', category: 'texture' },

  // Routine steps V2 (ordering, UI-facing)
  {
    key: 'STEP_NETTOYAGE_1',
    slug: 'step-nettoyage-1',
    label: '1er nettoyage',
    category: 'routine_step_v2',
  },
  {
    key: 'STEP_NETTOYAGE_2',
    slug: 'step-nettoyage-2',
    label: '2e nettoyage',
    category: 'routine_step_v2',
  },
  {
    key: 'STEP_PREPARATION',
    slug: 'step-preparation',
    label: 'Préparation',
    category: 'routine_step_v2',
  },
  {
    key: 'STEP_TRAITEMENT',
    slug: 'step-traitement',
    label: 'Traitement',
    category: 'routine_step_v2',
  },
  {
    key: 'STEP_HYDRATATION',
    slug: 'step-hydratation',
    label: 'Hydratation',
    category: 'routine_step_v2',
  },
  { key: 'STEP_OCCLUSIF', slug: 'step-occlusif', label: 'Occlusif', category: 'routine_step_v2' },
  {
    key: 'STEP_PROTECTION_SOLAIRE',
    slug: 'step-protection-solaire',
    label: 'Protection solaire',
    category: 'routine_step_v2',
  },

  // Routine moments (when to use)
  { key: 'MOMENT_MATIN', slug: 'moment-matin', label: 'Matin', category: 'routine_moment' },
  { key: 'MOMENT_SOIR', slug: 'moment-soir', label: 'Soir', category: 'routine_moment' },
  {
    key: 'MOMENT_HEBDOMADAIRE',
    slug: 'moment-hebdomadaire',
    label: 'Hebdomadaire',
    category: 'routine_moment',
  },
  {
    key: 'MOMENT_USAGE_LOCALISE',
    slug: 'moment-usage-localise',
    label: 'Usage localisé',
    category: 'routine_moment',
  },
  {
    key: 'MOMENT_CRISE',
    slug: 'moment-crise',
    label: 'En cas de crise',
    category: 'routine_moment',
  },

  // Skin effects (what the formula does)
  { key: 'OCCLUSIF', slug: 'occlusif', label: 'Occlusif', category: 'skin_effect' },
  { key: 'SEMI_OCCLUSIF', slug: 'semi-occlusif', label: 'Semi-occlusif', category: 'skin_effect' },
  { key: 'REPULPANT', slug: 'repulpant', label: 'Repulpant', category: 'skin_effect' },
  { key: 'MATIFIANT', slug: 'matifiant', label: 'Matifiant', category: 'skin_effect' },
  { key: 'ANTI_OXYDANT', slug: 'anti-oxydant', label: 'Anti-oxydant', category: 'skin_effect' },
  { key: 'APAISANT', slug: 'apaisant', label: 'Apaisant', category: 'skin_effect' },
  {
    key: 'SEBO_REGULATEUR',
    slug: 'sebo-regulateur',
    label: 'Sébo-régulateur',
    category: 'skin_effect',
  },
  { key: 'REPARATEUR', slug: 'reparateur', label: 'Réparateur', category: 'skin_effect' },
  { key: 'PURIFIANT', slug: 'purifiant', label: 'Purifiant', category: 'skin_effect' },
  { key: 'PREBIOTIQUE', slug: 'prebiotique', label: 'Prébiotique', category: 'skin_effect' },

  // Sensations (how the formula feels)
  { key: 'TEXTURE_RICHE', slug: 'texture-riche', label: 'Texture riche', category: 'sensation' },
  { key: 'TEXTURE_LEGERE', slug: 'texture-legere', label: 'Texture légère', category: 'sensation' },
  { key: 'NON_GRAS', slug: 'non-gras', label: 'Non gras', category: 'sensation' },
  { key: 'FINI_MAT', slug: 'fini-mat', label: 'Fini mat', category: 'sensation' },

  // Product characteristics — tolerance
  {
    key: 'SANS_PARFUM',
    slug: 'sans-parfum',
    label: 'Sans parfum',
    category: 'product_characteristic',
    subgroup: 'tolerance',
  },
  {
    key: 'SANS_ALLERGENES_PARFUMANTS',
    slug: 'sans-allergenes-parfumants',
    label: 'Sans allergènes parfumants',
    category: 'product_characteristic',
    subgroup: 'tolerance',
  },
  {
    key: 'SANS_ALCOOL_DENATURE',
    slug: 'sans-alcool-denature',
    label: 'Sans alcool dénaturé',
    category: 'product_characteristic',
    subgroup: 'tolerance',
  },
  {
    key: 'SANS_HUILES_ESSENTIELLES',
    slug: 'sans-huiles-essentielles',
    label: 'Sans huiles essentielles',
    category: 'product_characteristic',
    subgroup: 'tolerance',
  },
  {
    key: 'SANS_SULFATES',
    slug: 'sans-sulfates',
    label: 'Sans sulfates',
    category: 'product_characteristic',
    subgroup: 'tolerance',
  },
  {
    key: 'SANS_SILICONES',
    slug: 'sans-silicones',
    label: 'Sans silicones',
    category: 'product_characteristic',
    subgroup: 'tolerance',
  },
  {
    key: 'SANS_HUILES_MINERALES',
    slug: 'sans-huiles-minerales',
    label: 'Sans huiles minérales',
    category: 'product_characteristic',
    subgroup: 'tolerance',
  },
  {
    key: 'SANS_SAVON',
    slug: 'sans-savon',
    label: 'Sans savon',
    category: 'product_characteristic',
    subgroup: 'tolerance',
  },
  {
    key: 'HYPOALLERGENIQUE',
    slug: 'hypoallergenique',
    label: 'Hypoallergénique',
    category: 'product_characteristic',
    subgroup: 'tolerance',
  },
  {
    key: 'NON_IRRITANT',
    slug: 'non-irritant',
    label: 'Non irritant',
    category: 'product_characteristic',
    subgroup: 'tolerance',
  },
  {
    key: 'GROSSESSE_COMPATIBLE',
    slug: 'grossesse-compatible',
    label: 'Grossesse compatible',
    category: 'product_characteristic',
    subgroup: 'tolerance',
  },
  // Product characteristics — ethique
  {
    key: 'BIO_NATUREL',
    slug: 'bio-naturel',
    label: 'Bio / Naturel',
    category: 'product_characteristic',
    subgroup: 'ethique',
  },
  {
    key: 'VEGAN',
    slug: 'vegan',
    label: 'Vegan',
    category: 'product_characteristic',
    subgroup: 'ethique',
  },
  {
    key: 'CRUELTY_FREE',
    slug: 'cruelty-free',
    label: 'Cruelty-free',
    category: 'product_characteristic',
    subgroup: 'ethique',
  },
  // Product characteristics — technique
  {
    key: 'FILTRES_MINERAUX',
    slug: 'filtres-mineraux',
    label: 'Filtres minéraux',
    category: 'product_characteristic',
    subgroup: 'technique',
  },
  {
    key: 'FILTRES_CHIMIQUES',
    slug: 'filtres-chimiques',
    label: 'Filtres chimiques',
    category: 'product_characteristic',
    subgroup: 'technique',
  },
  {
    key: 'PIGMENTS_VERTS',
    slug: 'pigments-verts',
    label: 'Pigments verts',
    category: 'product_characteristic',
    subgroup: 'technique',
  },
  // Product characteristics — comedogenicite
  {
    key: 'NON_COMEDOGENE',
    slug: 'non-comedogene',
    label: 'Non comédogène',
    category: 'product_characteristic',
    subgroup: 'comedogenicite',
  },
  {
    key: 'COMEDOGENE',
    slug: 'comedogene',
    label: 'Comédogène',
    category: 'product_characteristic',
    subgroup: 'comedogenicite',
  },

  // Actif class (pharmacological clusters) — shared base mirrored from the
  // ingredient taxonomy, plus product-only extras (urea). Auto-derived at seed
  // time from a product's INCI via algo-derm normalize + substring match
  // (see backend/src/db/seed/utils/actif-class-detection.ts).
  ...SHARED_SKINCARE_ACTIF_CLASS_DEFS,
  { key: 'UREA', slug: 'urea', label: 'Urée', category: 'actif_class' },
] as const satisfies readonly ProductTagDef<SkincareProductTagCategory>[]

export const SKINCARE_PRODUCT_TAG_SLUGS = deriveTagSlugs(SKINCARE_PRODUCT_TAG_DEFS)

export type SkincareProductTagSlug =
  (typeof SKINCARE_PRODUCT_TAG_SLUGS)[keyof typeof SKINCARE_PRODUCT_TAG_SLUGS]
