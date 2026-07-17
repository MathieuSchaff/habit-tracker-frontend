// Haircare Product Tag definitions — single source of truth.
// One {key, slug, label, category} per tag; the legacy *_TAG_SLUGS object and
// the taxonomy (tag-taxonomy.ts) are derived from this array.
//
// concern / hair_type / hair_effect: slugs aligned with
// HAIRCARE_INGREDIENT_TAG_SLUGS (independent DB rows but shared slug
// → cross-entity consistency, same as skincare).
// product_type / routine_step / product_label: new slugs, product scope.

import { deriveTagSlugs, type ProductTagDef } from '../../tag-taxonomy-builder'

export const HAIRCARE_PRODUCT_TAG_CATEGORIES = [
  'concern',
  'hair_type',
  'product_type',
  'routine_step',
  'hair_effect',
  'product_label',
] as const

export type HaircareProductTagCategory = (typeof HAIRCARE_PRODUCT_TAG_CATEGORIES)[number]

export const HAIRCARE_PRODUCT_TAG_DEFS = [
  // Concerns
  { key: 'PELLICULES', slug: 'pellicules', label: 'Pellicules', category: 'concern' },
  { key: 'CHUTE', slug: 'chute', label: 'Chute de cheveux', category: 'concern' },
  { key: 'CASSE', slug: 'casse', label: 'Casse', category: 'concern' },
  { key: 'FOURCHES', slug: 'fourches', label: 'Fourches', category: 'concern' },
  { key: 'MANQUE_VOLUME', slug: 'manque-volume', label: 'Manque de volume', category: 'concern' },
  { key: 'CHEVEUX_SECS', slug: 'cheveux-secs', label: 'Cheveux secs', category: 'concern' },
  { key: 'CHEVEUX_GRAS', slug: 'cheveux-gras', label: 'Cheveux gras', category: 'concern' },
  {
    key: 'RACINES_GRASSES',
    slug: 'racines-grasses',
    label: 'Racines grasses',
    category: 'concern',
  },
  {
    key: 'CUIR_CHEVELU_SENSIBLE',
    slug: 'cuir-chevelu-sensible',
    label: 'Cuir chevelu sensible',
    category: 'concern',
  },
  {
    key: 'CUIR_CHEVELU_IRRITE',
    slug: 'cuir-chevelu-irrite',
    label: 'Cuir chevelu irrité',
    category: 'concern',
  },
  { key: 'ALOPECIE', slug: 'alopecie', label: 'Alopécie', category: 'concern' },
  {
    key: 'POST_COLORATION',
    slug: 'post-coloration',
    label: 'Post-coloration',
    category: 'concern',
  },
  { key: 'CHEVEUX_TERNES', slug: 'cheveux-ternes', label: 'Cheveux ternes', category: 'concern' },
  {
    key: 'JAUNISSEMENT_BLOND',
    slug: 'jaunissement-blond',
    label: 'Jaunissement blond',
    category: 'concern',
  },
  {
    key: 'POROSITE_EXCESSIVE',
    slug: 'porosite-excessive',
    label: 'Porosité excessive',
    category: 'concern',
  },
  { key: 'POINTES_SECHES', slug: 'pointes-seches', label: 'Pointes sèches', category: 'concern' },
  { key: 'POUX', slug: 'poux', label: 'Poux et lentes', category: 'concern' },

  // Hair types
  { key: 'LISSES', slug: 'lisses', label: 'Cheveux lisses', category: 'hair_type' },
  { key: 'ONDULES', slug: 'ondules', label: 'Cheveux ondulés', category: 'hair_type' },
  { key: 'BOUCLES', slug: 'boucles', label: 'Cheveux bouclés', category: 'hair_type' },
  { key: 'CREPUS', slug: 'crepus', label: 'Cheveux crépus', category: 'hair_type' },
  { key: 'FINS', slug: 'fins', label: 'Cheveux fins', category: 'hair_type' },
  { key: 'EPAIS', slug: 'epais', label: 'Cheveux épais', category: 'hair_type' },
  { key: 'MOYENS', slug: 'moyens', label: 'Cheveux moyens', category: 'hair_type' },
  { key: 'COLORES', slug: 'colores', label: 'Cheveux colorés', category: 'hair_type' },
  { key: 'DECOLORES', slug: 'decolores', label: 'Cheveux décolorés', category: 'hair_type' },
  { key: 'NATURELS', slug: 'naturels', label: 'Cheveux naturels', category: 'hair_type' },
  {
    key: 'CHEVEUX_TOUS_TYPES',
    slug: 'cheveux-tous-types',
    label: 'Tous types de cheveux',
    category: 'hair_type',
  },

  // Product types
  { key: 'SHAMPOOING', slug: 'shampooing', label: 'Shampooing', category: 'product_type' },
  {
    key: 'SHAMPOOING_SEC',
    slug: 'shampooing-sec',
    label: 'Shampooing sec',
    category: 'product_type',
  },
  {
    key: 'SHAMPOOING_CLARIFIANT',
    slug: 'shampooing-clarifiant',
    label: 'Shampooing clarifiant',
    category: 'product_type',
  },
  { key: 'CO_WASH', slug: 'co-wash', label: 'Co-wash', category: 'product_type' },
  {
    key: 'APRES_SHAMPOOING',
    slug: 'apres-shampooing',
    label: 'Après-shampooing',
    category: 'product_type',
  },
  {
    key: 'MASQUE_CAPILLAIRE',
    slug: 'masque-capillaire',
    label: 'Masque capillaire',
    category: 'product_type',
  },
  { key: 'SOIN_PROFOND', slug: 'soin-profond', label: 'Soin profond', category: 'product_type' },
  {
    key: 'SERUM_CAPILLAIRE',
    slug: 'serum-capillaire',
    label: 'Sérum capillaire',
    category: 'product_type',
  },
  {
    key: 'HUILE_CAPILLAIRE',
    slug: 'huile-capillaire',
    label: 'Huile capillaire',
    category: 'product_type',
  },
  { key: 'LEAVE_IN', slug: 'leave-in', label: 'Leave-in', category: 'product_type' },
  {
    key: 'LOTION_FORTIFIANTE',
    slug: 'lotion-fortifiante',
    label: 'Lotion fortifiante',
    category: 'product_type',
  },
  { key: 'GEL_COIFFANT', slug: 'gel-coiffant', label: 'Gel coiffant', category: 'product_type' },
  {
    key: 'MOUSSE_COIFFANTE',
    slug: 'mousse-coiffante',
    label: 'Mousse coiffante',
    category: 'product_type',
  },
  {
    key: 'CREME_COIFFANTE',
    slug: 'creme-coiffante',
    label: 'Crème coiffante',
    category: 'product_type',
  },
  {
    key: 'SPRAY_COIFFANT',
    slug: 'spray-coiffant',
    label: 'Spray coiffant',
    category: 'product_type',
  },
  {
    key: 'SPRAY_THERMOPROTECTEUR',
    slug: 'spray-thermoprotecteur',
    label: 'Spray thermoprotecteur',
    category: 'product_type',
  },
  {
    key: 'CIRE_COIFFANTE',
    slug: 'cire-coiffante',
    label: 'Cire coiffante',
    category: 'product_type',
  },

  // Routine step
  {
    key: 'PRE_SHAMPOOING',
    slug: 'pre-shampooing',
    label: 'Pré-shampooing',
    category: 'routine_step',
  },
  { key: 'LAVAGE', slug: 'lavage', label: 'Lavage', category: 'routine_step' },
  {
    key: 'CONDITIONNEMENT',
    slug: 'conditionnement',
    label: 'Conditionnement',
    category: 'routine_step',
  },
  {
    key: 'MASQUE_HEBDO_CHEVEUX',
    slug: 'masque-hebdo-cheveux',
    label: 'Masque hebdo cheveux',
    category: 'routine_step',
  },
  {
    key: 'TRAITEMENT_CUIR_CHEVELU',
    slug: 'traitement-cuir-chevelu',
    label: 'Traitement cuir chevelu',
    category: 'routine_step',
  },
  {
    key: 'SOIN_SANS_RINCAGE',
    slug: 'soin-sans-rincage',
    label: 'Soin sans rinçage',
    category: 'routine_step',
  },
  { key: 'COIFFAGE', slug: 'coiffage', label: 'Coiffage', category: 'routine_step' },
  { key: 'FINITION', slug: 'finition', label: 'Finition', category: 'routine_step' },

  // Hair effect
  // `brillance` / `hydratation` renamed with -cheveux suffix to avoid a DB
  // collision with skincare slugs (concern.brillance, routine_step.hydratation) —
  // product_tags.slug is UNIQUE, not (slug, tagType).
  { key: 'BRILLANCE', slug: 'brillance-cheveux', label: 'Brillance', category: 'hair_effect' },
  { key: 'DOUCEUR', slug: 'douceur', label: 'Douceur', category: 'hair_effect' },
  { key: 'VOLUME', slug: 'volume', label: 'Volume', category: 'hair_effect' },
  { key: 'DISCIPLINE', slug: 'discipline', label: 'Discipline', category: 'hair_effect' },
  {
    key: 'HYDRATATION',
    slug: 'hydratation-cheveux',
    label: 'Hydratation',
    category: 'hair_effect',
  },
  { key: 'NUTRITION', slug: 'nutrition', label: 'Nutrition', category: 'hair_effect' },
  { key: 'LISSANT', slug: 'lissant', label: 'Lissant', category: 'hair_effect' },
  { key: 'FIXATION', slug: 'fixation', label: 'Fixation', category: 'hair_effect' },
  {
    key: 'DEFINITION_BOUCLES',
    slug: 'definition-boucles',
    label: 'Définition boucles',
    category: 'hair_effect',
  },
  { key: 'GAINAGE', slug: 'gainage', label: 'Gainage', category: 'hair_effect' },
  {
    key: 'ANTI_FRISOTTIS',
    slug: 'anti-frisottis',
    label: 'Anti-frisottis',
    category: 'hair_effect',
  },
  { key: 'DEMELAGE', slug: 'demelage', label: 'Démêlage', category: 'hair_effect' },
  { key: 'REPARATION', slug: 'reparation', label: 'Réparation', category: 'hair_effect' },
  {
    key: 'THERMOPROTECTION',
    slug: 'thermoprotection',
    label: 'Thermoprotection',
    category: 'hair_effect',
  },

  // Product labels
  {
    key: 'SANS_SULFATES',
    slug: 'sans-sulfates',
    label: 'Sans sulfates',
    category: 'product_label',
  },
  {
    key: 'SANS_SILICONES',
    slug: 'sans-silicones',
    label: 'Sans silicones',
    category: 'product_label',
  },
  {
    key: 'CGM_FRIENDLY',
    slug: 'cgm-friendly',
    label: 'Curly Girl Method',
    category: 'product_label',
  },
] as const satisfies readonly ProductTagDef<HaircareProductTagCategory>[]

export const HAIRCARE_PRODUCT_TAG_SLUGS = deriveTagSlugs(HAIRCARE_PRODUCT_TAG_DEFS)

export type HaircareProductTagSlug =
  (typeof HAIRCARE_PRODUCT_TAG_SLUGS)[keyof typeof HAIRCARE_PRODUCT_TAG_SLUGS]
