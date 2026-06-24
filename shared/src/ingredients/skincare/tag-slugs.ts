// Skincare Ingredient Tag definitions — single source of truth.
// One {key, slug, category} per tag (ingredient labels live in the seed, not
// shared); the legacy *_TAG_SLUGS object and the {category} taxonomy are derived.
// Tags applicable to skincare/haircare/dental ingredients.
// Categories: concern, skin_type, ingredient_attribute, skin_effect, shared_label, actif_class.

import { deriveTagSlugs, type ProductTagDef, type TagDef } from '../../tag-api/tag-taxonomy-builder'

// Actif class (pharmacological clusters) — single source of truth for the
// slugs shared with skincare PRODUCT tags. The product taxonomy spreads these
// defs and adds product-only extras (urea); drift between the two fails to
// compile. Labels are carried here for the product taxonomy (ingredient
// taxonomies are label-less); the ingredient side ignores them.
export const SHARED_SKINCARE_ACTIF_CLASS_DEFS = [
  { key: 'RETINOIDS', slug: 'retinoids', label: 'Rétinoïdes', category: 'actif_class' },
  { key: 'VITAMIN_C', slug: 'vitamin-c', label: 'Vitamine C', category: 'actif_class' },
  { key: 'VITAMIN_E', slug: 'vitamin-e', label: 'Vitamine E', category: 'actif_class' },
  { key: 'AHA', slug: 'aha', label: 'AHA', category: 'actif_class' },
  { key: 'BHA', slug: 'bha', label: 'BHA', category: 'actif_class' },
  { key: 'PHA', slug: 'pha', label: 'PHA', category: 'actif_class' },
  {
    key: 'ENZYMES_EXFOLIANTS',
    slug: 'enzymes-exfoliants',
    label: 'Enzymes exfoliantes',
    category: 'actif_class',
  },
  { key: 'CERAMIDES', slug: 'ceramides', label: 'Céramides', category: 'actif_class' },
  {
    key: 'HYALURONIC_ACID',
    slug: 'hyaluronic-acid',
    label: 'Acide hyaluronique',
    category: 'actif_class',
  },
  { key: 'PEPTIDES', slug: 'peptides', label: 'Peptides', category: 'actif_class' },
  { key: 'POLYPHENOLS', slug: 'polyphenols', label: 'Polyphénols', category: 'actif_class' },
  {
    key: 'TYROSINASE_INHIBITORS',
    slug: 'tyrosinase-inhibitors',
    label: 'Inhibiteurs de tyrosinase',
    category: 'actif_class',
  },
] as const satisfies readonly ProductTagDef<'actif_class'>[]

export const SHARED_SKINCARE_ACTIF_CLASS_SLUGS = deriveTagSlugs(SHARED_SKINCARE_ACTIF_CLASS_DEFS)

export const SKINCARE_INGREDIENT_TAG_CATEGORIES = [
  'concern',
  'skin_type',
  'ingredient_attribute',
  'skin_effect',
  'shared_label',
  'actif_class',
] as const

export type SkincareIngredientTagCategory = (typeof SKINCARE_INGREDIENT_TAG_CATEGORIES)[number]

export const SKINCARE_INGREDIENT_TAG_DEFS = [
  // Concerns
  { key: 'ANTI_ROUGEURS', slug: 'anti-rougeurs', category: 'concern' },
  { key: 'ROSACEE', slug: 'rosacee', category: 'concern' },
  { key: 'COUPEROSE', slug: 'couperose', category: 'concern' },
  { key: 'FLUSHS', slug: 'flushs', category: 'concern' },
  { key: 'BARRIERE_CUTANEE', slug: 'barriere-cutanee', category: 'concern' },
  { key: 'ANTI_TACHES', slug: 'anti-taches', category: 'concern' },
  { key: 'ANTI_ACNE', slug: 'anti-acne', category: 'concern' },
  { key: 'ANTI_AGE', slug: 'anti-age', category: 'concern' },
  { key: 'HYPERPIGMENTATION', slug: 'hyperpigmentation', category: 'concern' },
  { key: 'DESHYDRATATION', slug: 'deshydratation', category: 'concern' },
  { key: 'PORES_DILATES', slug: 'pores-dilates', category: 'concern' },
  { key: 'CERNES_POCHES', slug: 'cernes-poches', category: 'concern' },
  { key: 'BRILLANCE', slug: 'brillance', category: 'concern' },
  { key: 'ECLAT', slug: 'eclat', category: 'concern' },
  { key: 'POST_ACNE', slug: 'post-acne', category: 'concern' },
  { key: 'CICATRISATION', slug: 'cicatrisation', category: 'concern' },
  { key: 'MICROBIOME', slug: 'microbiome', category: 'concern' },
  { key: 'PHOTO_VIEILLISSEMENT', slug: 'photo-vieillissement', category: 'concern' },
  { key: 'TEINT_TERNE', slug: 'teint-terne', category: 'concern' },
  { key: 'LUMIERE_BLEUE', slug: 'lumiere-bleue', category: 'concern' },
  { key: 'POLLUTION', slug: 'pollution', category: 'concern' },
  { key: 'ECZEMA', slug: 'eczema', category: 'concern' },
  { key: 'GRAIN_PEAU', slug: 'grain-peau', category: 'concern' },
  { key: 'KERATOSE_PILAIRE', slug: 'keratose-pilaire', category: 'concern' },
  { key: 'PHOTO_PROTECTION', slug: 'photo-protection', category: 'concern' },
  { key: 'BARRIERE_CUTANEE_ALTEREE', slug: 'barriere-cutanee-alteree', category: 'concern' },

  // Skin types
  { key: 'PEAU_SECHE', slug: 'peau-seche', category: 'skin_type' },
  { key: 'PEAU_MIXTE', slug: 'peau-mixte', category: 'skin_type' },
  { key: 'PEAU_GRASSE', slug: 'peau-grasse', category: 'skin_type' },
  { key: 'PEAU_SENSIBLE', slug: 'peau-sensible', category: 'skin_type' },
  { key: 'PEAU_NORMALE', slug: 'peau-normale', category: 'skin_type' },

  // Ingredient attributes
  // filtres-chimiques / filtres-mineraux are ingredient_attribute slugs (UV
  // filter subtype) shared with product tags; grouped here with the rest of the
  // attribute family.
  { key: 'ANTI_OXYDANT', slug: 'anti-oxydant', category: 'ingredient_attribute' },
  { key: 'HUMECTANT', slug: 'humectant', category: 'ingredient_attribute' },
  { key: 'EMOLLIENT', slug: 'emollient', category: 'ingredient_attribute' },
  { key: 'REPARATEUR', slug: 'reparateur', category: 'ingredient_attribute' },
  { key: 'ANTISEPTIQUE', slug: 'antiseptique', category: 'ingredient_attribute' },
  { key: 'KERATOLYTIQUE', slug: 'keratolytique', category: 'ingredient_attribute' },
  { key: 'SEBO_REGULATEUR', slug: 'sebo-regulateur', category: 'ingredient_attribute' },
  { key: 'ASTRINGENT', slug: 'astringent', category: 'ingredient_attribute' },
  { key: 'ANTI_BACTERIEN', slug: 'anti-bacterien', category: 'ingredient_attribute' },
  { key: 'BIOMIMETIQUE', slug: 'biomimetique', category: 'ingredient_attribute' },
  { key: 'APAISANT', slug: 'apaisant', category: 'ingredient_attribute' },
  { key: 'PREBIOTIQUE', slug: 'prebiotique', category: 'ingredient_attribute' },
  { key: 'ANTI_INFLAMMATOIRE', slug: 'anti-inflammatoire', category: 'ingredient_attribute' },
  { key: 'PURIFIANT', slug: 'purifiant', category: 'ingredient_attribute' },
  { key: 'FILTRE_UV', slug: 'filtre-uv', category: 'ingredient_attribute' },
  { key: 'FILTRES_CHIMIQUES', slug: 'filtres-chimiques', category: 'ingredient_attribute' },
  { key: 'FILTRES_MINERAUX', slug: 'filtres-mineraux', category: 'ingredient_attribute' },
  { key: 'TENSIOACTIF', slug: 'tensioactif', category: 'ingredient_attribute' },
  { key: 'EXCIPIENT', slug: 'excipient', category: 'ingredient_attribute' },
  { key: 'ACTIF', slug: 'actif', category: 'ingredient_attribute' },

  // Skin effects (both-scoped: also apply to molecules)
  { key: 'OCCLUSIF', slug: 'occlusif', category: 'skin_effect' },
  { key: 'REPULPANT', slug: 'repulpant', category: 'skin_effect' },
  { key: 'MATIFIANT', slug: 'matifiant', category: 'skin_effect' },
  { key: 'EFFET_PROTECTEUR', slug: 'effet-protecteur', category: 'skin_effect' },

  // Shared labels
  { key: 'COMEDOGENE', slug: 'comedogene', category: 'shared_label' },
  { key: 'NON_COMEDOGENE', slug: 'non-comedogene', category: 'shared_label' },
  // Contra-indication flag — used in `avoid:` arrays on retinoids and other
  // pregnancy-restricted actives.
  { key: 'GROSSESSE_COMPATIBLE', slug: 'grossesse-compatible', category: 'shared_label' },

  // Actif class (pharmacological clusters) — group molecules that share a
  // mechanism of action so routine rules (e.g. "max 1 retinoid", "redundant
  // vitamin C variants") and UI filters can target the family, not each member.
  ...SHARED_SKINCARE_ACTIF_CLASS_DEFS,
] as const satisfies readonly TagDef<SkincareIngredientTagCategory>[]

export const SKINCARE_INGREDIENT_TAG_SLUGS = deriveTagSlugs(SKINCARE_INGREDIENT_TAG_DEFS)

export type SkincareIngredientTagSlug =
  (typeof SKINCARE_INGREDIENT_TAG_SLUGS)[keyof typeof SKINCARE_INGREDIENT_TAG_SLUGS]
