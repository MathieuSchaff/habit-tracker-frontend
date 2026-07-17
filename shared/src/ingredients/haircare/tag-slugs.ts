// Haircare Ingredient Tag definitions — single source of truth.
// One {key, slug, label, category} per tag; the legacy *_TAG_SLUGS object, the
// {category} taxonomy and the slug->label map are derived.

import { deriveTagSlugs, type LabeledTagDef } from '../../tag-taxonomy-builder'

export const HAIRCARE_INGREDIENT_TAG_CATEGORIES = [
  'concern',
  'hair_type',
  'ingredient_attribute',
  'hair_effect',
] as const

export type HaircareIngredientTagCategory = (typeof HAIRCARE_INGREDIENT_TAG_CATEGORIES)[number]

export const HAIRCARE_INGREDIENT_TAG_DEFS = [
  // Concerns
  { key: 'PELLICULES', slug: 'pellicules', label: 'Pellicules', category: 'concern' },
  { key: 'CHUTE', slug: 'chute', label: 'Chute de cheveux', category: 'concern' },
  { key: 'CASSE', slug: 'casse', label: 'Casse', category: 'concern' },
  { key: 'FOURCHES', slug: 'fourches', label: 'Fourches', category: 'concern' },
  { key: 'FRISOTTIS', slug: 'frisottis', label: 'Frisottis', category: 'concern' },
  { key: 'MANQUE_VOLUME', slug: 'manque-volume', label: 'Manque de volume', category: 'concern' },
  { key: 'CHEVEUX_SECS', slug: 'cheveux-secs', label: 'Cheveux secs', category: 'concern' },
  { key: 'CHEVEUX_GRAS', slug: 'cheveux-gras', label: 'Cheveux gras', category: 'concern' },
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

  // Hair type
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

  // Ingredient attribute (biochemical)
  { key: 'HUMECTANT', slug: 'humectant', label: 'Humectant', category: 'ingredient_attribute' },
  { key: 'EMOLLIENT', slug: 'emollient', label: 'Émollient', category: 'ingredient_attribute' },
  { key: 'PROTEINE', slug: 'proteine', label: 'Protéine', category: 'ingredient_attribute' },
  {
    key: 'FILM_PROTECTEUR',
    slug: 'film-protecteur',
    label: 'Film protecteur',
    category: 'ingredient_attribute',
  },
  {
    key: 'TENSIOACTIF_DOUX',
    slug: 'tensioactif-doux',
    label: 'Tensioactif doux',
    category: 'ingredient_attribute',
  },
  { key: 'CHELATEUR', slug: 'chelateur', label: 'Chélateur', category: 'ingredient_attribute' },
  {
    key: 'ANTI_PELLICULAIRE',
    slug: 'anti-pelliculaire',
    label: 'Anti-pelliculaire',
    category: 'ingredient_attribute',
  },
  {
    key: 'STIMULANT_FOLLICULE',
    slug: 'stimulant-follicule',
    label: 'Stimulant folliculaire',
    category: 'ingredient_attribute',
  },
  {
    key: 'CONDITIONNEUR_CATIONIQUE',
    slug: 'conditionneur-cationique',
    label: 'Conditionneur cationique',
    category: 'ingredient_attribute',
  },
  { key: 'GAINANT', slug: 'gainant', label: 'Gainant', category: 'ingredient_attribute' },

  // Hair effect
  { key: 'BRILLANCE', slug: 'brillance', label: 'Brillance', category: 'hair_effect' },
  { key: 'DOUCEUR', slug: 'douceur', label: 'Douceur', category: 'hair_effect' },
  { key: 'VOLUME', slug: 'volume', label: 'Volume', category: 'hair_effect' },
  { key: 'DISCIPLINE', slug: 'discipline', label: 'Discipline', category: 'hair_effect' },
  { key: 'HYDRATATION', slug: 'hydratation', label: 'Hydratation', category: 'hair_effect' },
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
] as const satisfies readonly LabeledTagDef<HaircareIngredientTagCategory>[]

export const HAIRCARE_INGREDIENT_TAG_SLUGS = deriveTagSlugs(HAIRCARE_INGREDIENT_TAG_DEFS)

export type HaircareIngredientTagSlug =
  (typeof HAIRCARE_INGREDIENT_TAG_SLUGS)[keyof typeof HAIRCARE_INGREDIENT_TAG_SLUGS]
