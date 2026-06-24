// Haircare Ingredient Tag definitions — single source of truth.
// One {key, slug, category} per tag (ingredient labels live in the seed, not
// shared); the legacy *_TAG_SLUGS object and the {category} taxonomy are derived.

import { deriveTagSlugs, type TagDef } from '../../tag-api/tag-taxonomy-builder'

export const HAIRCARE_INGREDIENT_TAG_CATEGORIES = [
  'concern',
  'hair_type',
  'ingredient_attribute',
  'hair_effect',
] as const

export type HaircareIngredientTagCategory = (typeof HAIRCARE_INGREDIENT_TAG_CATEGORIES)[number]

export const HAIRCARE_INGREDIENT_TAG_DEFS = [
  // Concerns
  { key: 'PELLICULES', slug: 'pellicules', category: 'concern' },
  { key: 'CHUTE', slug: 'chute', category: 'concern' },
  { key: 'CASSE', slug: 'casse', category: 'concern' },
  { key: 'FOURCHES', slug: 'fourches', category: 'concern' },
  { key: 'FRISOTTIS', slug: 'frisottis', category: 'concern' },
  { key: 'MANQUE_VOLUME', slug: 'manque-volume', category: 'concern' },
  { key: 'CHEVEUX_SECS', slug: 'cheveux-secs', category: 'concern' },
  { key: 'CHEVEUX_GRAS', slug: 'cheveux-gras', category: 'concern' },
  { key: 'CUIR_CHEVELU_SENSIBLE', slug: 'cuir-chevelu-sensible', category: 'concern' },
  { key: 'CUIR_CHEVELU_IRRITE', slug: 'cuir-chevelu-irrite', category: 'concern' },
  { key: 'ALOPECIE', slug: 'alopecie', category: 'concern' },
  { key: 'POST_COLORATION', slug: 'post-coloration', category: 'concern' },
  { key: 'CHEVEUX_TERNES', slug: 'cheveux-ternes', category: 'concern' },
  { key: 'JAUNISSEMENT_BLOND', slug: 'jaunissement-blond', category: 'concern' },
  { key: 'POROSITE_EXCESSIVE', slug: 'porosite-excessive', category: 'concern' },
  { key: 'POINTES_SECHES', slug: 'pointes-seches', category: 'concern' },

  // Hair type
  { key: 'LISSES', slug: 'lisses', category: 'hair_type' },
  { key: 'ONDULES', slug: 'ondules', category: 'hair_type' },
  { key: 'BOUCLES', slug: 'boucles', category: 'hair_type' },
  { key: 'CREPUS', slug: 'crepus', category: 'hair_type' },
  { key: 'FINS', slug: 'fins', category: 'hair_type' },
  { key: 'EPAIS', slug: 'epais', category: 'hair_type' },
  { key: 'MOYENS', slug: 'moyens', category: 'hair_type' },
  { key: 'COLORES', slug: 'colores', category: 'hair_type' },
  { key: 'DECOLORES', slug: 'decolores', category: 'hair_type' },
  { key: 'NATURELS', slug: 'naturels', category: 'hair_type' },
  { key: 'CHEVEUX_TOUS_TYPES', slug: 'cheveux-tous-types', category: 'hair_type' },

  // Ingredient attribute (biochemical)
  { key: 'HUMECTANT', slug: 'humectant', category: 'ingredient_attribute' },
  { key: 'EMOLLIENT', slug: 'emollient', category: 'ingredient_attribute' },
  { key: 'PROTEINE', slug: 'proteine', category: 'ingredient_attribute' },
  { key: 'FILM_PROTECTEUR', slug: 'film-protecteur', category: 'ingredient_attribute' },
  { key: 'TENSIOACTIF_DOUX', slug: 'tensioactif-doux', category: 'ingredient_attribute' },
  { key: 'CHELATEUR', slug: 'chelateur', category: 'ingredient_attribute' },
  { key: 'ANTI_PELLICULAIRE', slug: 'anti-pelliculaire', category: 'ingredient_attribute' },
  { key: 'STIMULANT_FOLLICULE', slug: 'stimulant-follicule', category: 'ingredient_attribute' },
  {
    key: 'CONDITIONNEUR_CATIONIQUE',
    slug: 'conditionneur-cationique',
    category: 'ingredient_attribute',
  },
  { key: 'GAINANT', slug: 'gainant', category: 'ingredient_attribute' },

  // Hair effect
  { key: 'BRILLANCE', slug: 'brillance', category: 'hair_effect' },
  { key: 'DOUCEUR', slug: 'douceur', category: 'hair_effect' },
  { key: 'VOLUME', slug: 'volume', category: 'hair_effect' },
  { key: 'DISCIPLINE', slug: 'discipline', category: 'hair_effect' },
  { key: 'HYDRATATION', slug: 'hydratation', category: 'hair_effect' },
  { key: 'NUTRITION', slug: 'nutrition', category: 'hair_effect' },
  { key: 'LISSANT', slug: 'lissant', category: 'hair_effect' },
  { key: 'FIXATION', slug: 'fixation', category: 'hair_effect' },
  { key: 'DEFINITION_BOUCLES', slug: 'definition-boucles', category: 'hair_effect' },
  { key: 'GAINAGE', slug: 'gainage', category: 'hair_effect' },
] as const satisfies readonly TagDef<HaircareIngredientTagCategory>[]

export const HAIRCARE_INGREDIENT_TAG_SLUGS = deriveTagSlugs(HAIRCARE_INGREDIENT_TAG_DEFS)

export type HaircareIngredientTagSlug =
  (typeof HAIRCARE_INGREDIENT_TAG_SLUGS)[keyof typeof HAIRCARE_INGREDIENT_TAG_SLUGS]
