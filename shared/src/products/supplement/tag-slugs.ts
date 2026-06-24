// Supplement Product Tag definitions — single source of truth.
// One {key, slug, label, category} per tag; the legacy *_TAG_SLUGS object and
// the taxonomy (tag-taxonomy.ts) are derived from this array.
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

import { deriveTagSlugs, type ProductTagDef } from '../../tag-api/tag-taxonomy-builder'

export const SUPPLEMENT_PRODUCT_TAG_CATEGORIES = [
  'goal',
  'moment',
  'restriction',
  'product_type',
  'product_label',
] as const

export type SupplementProductTagCategory = (typeof SUPPLEMENT_PRODUCT_TAG_CATEGORIES)[number]

export const SUPPLEMENT_PRODUCT_TAG_DEFS = [
  // Goals
  { key: 'SOMMEIL', slug: 'sommeil', label: 'Sommeil', category: 'goal' },
  { key: 'ENERGIE', slug: 'energie', label: 'Énergie', category: 'goal' },
  { key: 'COGNITION', slug: 'cognition', label: 'Cognition', category: 'goal' },
  { key: 'IMMUNITE', slug: 'immunite', label: 'Immunité', category: 'goal' },
  {
    key: 'PEAU_CHEVEUX_ONGLES',
    slug: 'peau-cheveux-ongles',
    label: 'Peau, cheveux, ongles',
    category: 'goal',
  },
  { key: 'DIGESTION', slug: 'digestion', label: 'Digestion', category: 'goal' },
  { key: 'STRESS_ANXIETE', slug: 'stress-anxiete', label: 'Stress & anxiété', category: 'goal' },
  {
    key: 'RECUPERATION_MUSCULAIRE',
    slug: 'recuperation-musculaire',
    label: 'Récupération musculaire',
    category: 'goal',
  },
  { key: 'LONGEVITE', slug: 'longevite', label: 'Longévité', category: 'goal' },
  { key: 'HORMONAL', slug: 'hormonal', label: 'Équilibre hormonal', category: 'goal' },

  // Moment
  // Suffixed `MATIN_SUPPLEMENT` / `SOIR_SUPPLEMENT` keep distinct DB slug
  // values vs `SUPPLEMENT_INGREDIENT_TAG_SLUGS.MATIN` (same display, distinct
  // row — same pattern as haircare `brillance-cheveux`).
  { key: 'MATIN_SUPPLEMENT', slug: 'matin-supplement', label: 'Matin', category: 'moment' },
  { key: 'SOIR_SUPPLEMENT', slug: 'soir-supplement', label: 'Soir', category: 'moment' },
  { key: 'AVEC_REPAS', slug: 'avec-repas', label: 'Avec repas', category: 'moment' },
  { key: 'A_JEUN', slug: 'a-jeun', label: 'À jeun', category: 'moment' },
  { key: 'AUTOUR_SPORT', slug: 'autour-sport', label: 'Autour du sport', category: 'moment' },

  // Restriction
  {
    key: 'GROSSESSE_INCOMPATIBLE',
    slug: 'grossesse-incompatible',
    label: 'Contre-indiqué grossesse',
    category: 'restriction',
  },
  {
    key: 'ALLAITEMENT_INCOMPATIBLE',
    slug: 'allaitement-incompatible',
    label: 'Contre-indiqué allaitement',
    category: 'restriction',
  },
  {
    key: 'INTERACTION_ANTICOAGULANTS',
    slug: 'interaction-anticoagulants',
    label: 'Interaction anticoagulants',
    category: 'restriction',
  },
  {
    key: 'INTERACTION_THYROIDE',
    slug: 'interaction-thyroide',
    label: 'Interaction thyroïde',
    category: 'restriction',
  },

  // Product types
  { key: 'GELULE', slug: 'gelule', label: 'Gélule', category: 'product_type' },
  { key: 'CAPSULE', slug: 'capsule', label: 'Capsule', category: 'product_type' },
  { key: 'COMPRIME', slug: 'comprime', label: 'Comprimé', category: 'product_type' },
  {
    key: 'AMPOULE_BUVABLE',
    slug: 'ampoule-buvable',
    label: 'Ampoule buvable',
    category: 'product_type',
  },
  { key: 'POUDRE', slug: 'poudre', label: 'Poudre', category: 'product_type' },
  { key: 'SIROP', slug: 'sirop', label: 'Sirop', category: 'product_type' },
  { key: 'GUMMY', slug: 'gummy', label: 'Gummy', category: 'product_type' },
  { key: 'HUILE_ORALE', slug: 'huile-orale', label: 'Huile orale', category: 'product_type' },
  {
    key: 'SPRAY_SUBLINGUAL',
    slug: 'spray-sublingual',
    label: 'Spray sublingual',
    category: 'product_type',
  },

  // Product labels
  { key: 'SANS_GLUTEN', slug: 'sans-gluten', label: 'Sans gluten', category: 'product_label' },
  { key: 'SANS_LACTOSE', slug: 'sans-lactose', label: 'Sans lactose', category: 'product_label' },
  { key: 'BIO', slug: 'bio', label: 'Bio', category: 'product_label' },
  {
    key: 'FABRICATION_FR',
    slug: 'fabrication-fr',
    label: 'Fabrication française',
    category: 'product_label',
  },
  {
    key: 'EXTRAIT_TITRE',
    slug: 'extrait-titre',
    label: 'Extrait titré',
    category: 'product_label',
  },
  {
    key: 'DOSE_CLINIQUE',
    slug: 'dose-clinique',
    label: 'Dose clinique',
    category: 'product_label',
  },
] as const satisfies readonly ProductTagDef<SupplementProductTagCategory>[]

export const SUPPLEMENT_PRODUCT_TAG_SLUGS = deriveTagSlugs(SUPPLEMENT_PRODUCT_TAG_DEFS)

export type SupplementProductTagSlug =
  (typeof SUPPLEMENT_PRODUCT_TAG_SLUGS)[keyof typeof SUPPLEMENT_PRODUCT_TAG_SLUGS]
