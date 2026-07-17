// Skincare Ingredient Tag definitions — single source of truth.
// One {key, slug, label, category} per tag; the legacy *_TAG_SLUGS object, the
// {category} taxonomy and the slug->label map are derived.
// Tags applicable to skincare/haircare/dental ingredients.
// Categories: concern, skin_type, ingredient_attribute, skin_effect, shared_label, actif_class.

import { deriveTagSlugs, type LabeledTagDef, type ProductTagDef } from '../../tag-taxonomy-builder'

// Actif class (pharmacological clusters) — single source of truth for the
// slugs shared with skincare PRODUCT tags. The product taxonomy spreads these
// defs and adds product-only extras (urea); drift between the two fails to
// compile. Labels are shared by both sides — the same FR label feeds the product
// taxonomy and the ingredient slug->label map.
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
  { key: 'ANTI_ROUGEURS', slug: 'anti-rougeurs', label: 'Anti-rougeurs', category: 'concern' },
  { key: 'ROSACEE', slug: 'rosacee', label: 'Rosacée', category: 'concern' },
  { key: 'COUPEROSE', slug: 'couperose', label: 'Couperose', category: 'concern' },
  { key: 'FLUSHS', slug: 'flushs', label: 'Flushs', category: 'concern' },
  {
    key: 'BARRIERE_CUTANEE',
    slug: 'barriere-cutanee',
    label: 'Barrière cutanée',
    category: 'concern',
  },
  { key: 'ANTI_TACHES', slug: 'anti-taches', label: 'Anti-taches', category: 'concern' },
  { key: 'ANTI_ACNE', slug: 'anti-acne', label: 'Anti-acné', category: 'concern' },
  { key: 'ANTI_AGE', slug: 'anti-age', label: 'Anti-âge', category: 'concern' },
  {
    key: 'HYPERPIGMENTATION',
    slug: 'hyperpigmentation',
    label: 'Hyperpigmentation',
    category: 'concern',
  },
  { key: 'DESHYDRATATION', slug: 'deshydratation', label: 'Déshydratation', category: 'concern' },
  { key: 'PORES_DILATES', slug: 'pores-dilates', label: 'Pores dilatés', category: 'concern' },
  { key: 'CERNES_POCHES', slug: 'cernes-poches', label: 'Cernes et poches', category: 'concern' },
  { key: 'BRILLANCE', slug: 'brillance', label: 'Brillance', category: 'concern' },
  { key: 'ECLAT', slug: 'eclat', label: 'Éclat', category: 'concern' },
  { key: 'POST_ACNE', slug: 'post-acne', label: 'Marques post-acné', category: 'concern' },
  { key: 'CICATRISATION', slug: 'cicatrisation', label: 'Cicatrisation', category: 'concern' },
  { key: 'MICROBIOME', slug: 'microbiome', label: 'Microbiome', category: 'concern' },
  {
    key: 'PHOTO_VIEILLISSEMENT',
    slug: 'photo-vieillissement',
    label: 'Photo-vieillissement',
    category: 'concern',
  },
  { key: 'TEINT_TERNE', slug: 'teint-terne', label: 'Teint terne', category: 'concern' },
  { key: 'LUMIERE_BLEUE', slug: 'lumiere-bleue', label: 'Lumière bleue', category: 'concern' },
  { key: 'POLLUTION', slug: 'pollution', label: 'Pollution', category: 'concern' },
  { key: 'ECZEMA', slug: 'eczema', label: 'Eczéma', category: 'concern' },
  { key: 'GRAIN_PEAU', slug: 'grain-peau', label: 'Grain de peau', category: 'concern' },
  {
    key: 'KERATOSE_PILAIRE',
    slug: 'keratose-pilaire',
    label: 'Kératose pilaire',
    category: 'concern',
  },
  {
    key: 'PHOTO_PROTECTION',
    slug: 'photo-protection',
    label: 'Photoprotection',
    category: 'concern',
  },
  {
    key: 'BARRIERE_CUTANEE_ALTEREE',
    slug: 'barriere-cutanee-alteree',
    label: 'Barrière altérée',
    category: 'concern',
  },

  { key: 'PEAU_SECHE', slug: 'peau-seche', label: 'Peau sèche', category: 'skin_type' },
  { key: 'PEAU_MIXTE', slug: 'peau-mixte', label: 'Peau mixte', category: 'skin_type' },
  { key: 'PEAU_GRASSE', slug: 'peau-grasse', label: 'Peau grasse', category: 'skin_type' },
  { key: 'PEAU_SENSIBLE', slug: 'peau-sensible', label: 'Peau sensible', category: 'skin_type' },
  { key: 'PEAU_NORMALE', slug: 'peau-normale', label: 'Peau normale', category: 'skin_type' },

  // filtres-chimiques / filtres-mineraux are ingredient_attribute slugs (UV
  // filter subtype) shared with product tags; grouped here with the rest of the
  // attribute family.
  {
    key: 'ANTI_OXYDANT',
    slug: 'anti-oxydant',
    label: 'Anti-oxydant',
    category: 'ingredient_attribute',
  },
  { key: 'HUMECTANT', slug: 'humectant', label: 'Humectant', category: 'ingredient_attribute' },
  { key: 'EMOLLIENT', slug: 'emollient', label: 'Émollient', category: 'ingredient_attribute' },
  { key: 'REPARATEUR', slug: 'reparateur', label: 'Réparateur', category: 'ingredient_attribute' },
  {
    key: 'ANTISEPTIQUE',
    slug: 'antiseptique',
    label: 'Antiseptique',
    category: 'ingredient_attribute',
  },
  {
    key: 'KERATOLYTIQUE',
    slug: 'keratolytique',
    label: 'Kératolytique',
    category: 'ingredient_attribute',
  },
  {
    key: 'SEBO_REGULATEUR',
    slug: 'sebo-regulateur',
    label: 'Sébo-régulateur',
    category: 'ingredient_attribute',
  },
  { key: 'ASTRINGENT', slug: 'astringent', label: 'Astringent', category: 'ingredient_attribute' },
  {
    key: 'ANTI_BACTERIEN',
    slug: 'anti-bacterien',
    label: 'Anti-bactérien',
    category: 'ingredient_attribute',
  },
  {
    key: 'BIOMIMETIQUE',
    slug: 'biomimetique',
    label: 'Biomimétique',
    category: 'ingredient_attribute',
  },
  { key: 'APAISANT', slug: 'apaisant', label: 'Apaisant', category: 'ingredient_attribute' },
  {
    key: 'PREBIOTIQUE',
    slug: 'prebiotique',
    label: 'Prébiotique',
    category: 'ingredient_attribute',
  },
  {
    key: 'ANTI_INFLAMMATOIRE',
    slug: 'anti-inflammatoire',
    label: 'Anti-inflammatoire',
    category: 'ingredient_attribute',
  },
  { key: 'PURIFIANT', slug: 'purifiant', label: 'Purifiant', category: 'ingredient_attribute' },
  { key: 'FILTRE_UV', slug: 'filtre-uv', label: 'Filtre UV', category: 'ingredient_attribute' },
  {
    key: 'FILTRES_CHIMIQUES',
    slug: 'filtres-chimiques',
    label: 'Filtres chimiques',
    category: 'ingredient_attribute',
  },
  {
    key: 'FILTRES_MINERAUX',
    slug: 'filtres-mineraux',
    label: 'Filtres minéraux',
    category: 'ingredient_attribute',
  },
  {
    key: 'TENSIOACTIF',
    slug: 'tensioactif',
    label: 'Tensioactif',
    category: 'ingredient_attribute',
  },
  { key: 'EXCIPIENT', slug: 'excipient', label: 'Excipient', category: 'ingredient_attribute' },
  { key: 'ACTIF', slug: 'actif', label: 'Actif', category: 'ingredient_attribute' },

  // Skin effects (both-scoped: also apply to molecules)
  { key: 'OCCLUSIF', slug: 'occlusif', label: 'Occlusif', category: 'skin_effect' },
  { key: 'REPULPANT', slug: 'repulpant', label: 'Repulpant', category: 'skin_effect' },
  { key: 'MATIFIANT', slug: 'matifiant', label: 'Matifiant', category: 'skin_effect' },
  {
    key: 'EFFET_PROTECTEUR',
    slug: 'effet-protecteur',
    label: 'Effet protecteur',
    category: 'skin_effect',
  },

  { key: 'COMEDOGENE', slug: 'comedogene', label: 'Comédogène', category: 'shared_label' },
  {
    key: 'NON_COMEDOGENE',
    slug: 'non-comedogene',
    label: 'Non comédogène',
    category: 'shared_label',
  },
  // Contra-indication flag — used in `avoid:` arrays on retinoids and other
  // pregnancy-restricted actives.
  {
    key: 'GROSSESSE_COMPATIBLE',
    slug: 'grossesse-compatible',
    label: 'Grossesse compatible',
    category: 'shared_label',
  },

  // Actif class (pharmacological clusters) — group molecules that share a
  // mechanism of action so routine rules (e.g. "max 1 retinoid", "redundant
  // vitamin C variants") and UI filters can target the family, not each member.
  ...SHARED_SKINCARE_ACTIF_CLASS_DEFS,
] as const satisfies readonly LabeledTagDef<SkincareIngredientTagCategory>[]

export const SKINCARE_INGREDIENT_TAG_SLUGS = deriveTagSlugs(SKINCARE_INGREDIENT_TAG_DEFS)

export type SkincareIngredientTagSlug =
  (typeof SKINCARE_INGREDIENT_TAG_SLUGS)[keyof typeof SKINCARE_INGREDIENT_TAG_SLUGS]
