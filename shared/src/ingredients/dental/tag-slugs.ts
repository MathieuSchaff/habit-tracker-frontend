// Dental Ingredient Tag definitions — single source of truth.
// One {key, slug, category} per tag (ingredient labels live in the seed, not
// shared); the legacy *_TAG_SLUGS object and the {category} taxonomy are derived.

import { deriveTagSlugs, type TagDef } from '../../tag-api/tag-taxonomy-builder'

export const DENTAL_INGREDIENT_TAG_CATEGORIES = [
  'concern',
  'age_group',
  'ingredient_attribute',
  'dental_effect',
] as const

export type DentalIngredientTagCategory = (typeof DENTAL_INGREDIENT_TAG_CATEGORIES)[number]

export const DENTAL_INGREDIENT_TAG_DEFS = [
  // Concerns
  { key: 'CARIE', slug: 'carie', category: 'concern' },
  { key: 'SENSIBILITE_DENTINAIRE', slug: 'sensibilite-dentinaire', category: 'concern' },
  { key: 'GENCIVITE', slug: 'gencivite', category: 'concern' },
  { key: 'PARODONTITE', slug: 'parodontite', category: 'concern' },
  { key: 'PLAQUE', slug: 'plaque', category: 'concern' },
  { key: 'TARTRE', slug: 'tartre', category: 'concern' },
  { key: 'TACHES', slug: 'taches', category: 'concern' },
  { key: 'EROSION_ACIDE', slug: 'erosion-acide', category: 'concern' },
  { key: 'HALITOSE', slug: 'halitose', category: 'concern' },
  { key: 'BRUXISME', slug: 'bruxisme', category: 'concern' },
  { key: 'APHTES', slug: 'aphtes', category: 'concern' },

  // Age group
  { key: 'ADULTE', slug: 'adulte', category: 'age_group' },
  { key: 'ENFANT', slug: 'enfant', category: 'age_group' },
  { key: 'SENIOR', slug: 'senior', category: 'age_group' },
  { key: 'ORTHODONTIE', slug: 'orthodontie', category: 'age_group' },
  { key: 'IMPLANTS', slug: 'implants', category: 'age_group' },
  { key: 'DENTS_LAIT', slug: 'dents-lait', category: 'age_group' },

  // Ingredient attribute (biochemical)
  { key: 'REMINERALISANT', slug: 'remineralisant', category: 'ingredient_attribute' },
  { key: 'ANTIBACTERIEN', slug: 'antibacterien', category: 'ingredient_attribute' },
  { key: 'ANTI_PLAQUE', slug: 'anti-plaque', category: 'ingredient_attribute' },
  { key: 'ANTI_TARTRE', slug: 'anti-tartre', category: 'ingredient_attribute' },
  { key: 'ABRASIF_DOUX', slug: 'abrasif-doux', category: 'ingredient_attribute' },
  { key: 'ABRASIF_FORT', slug: 'abrasif-fort', category: 'ingredient_attribute' },
  { key: 'BLANCHISSANT', slug: 'blanchissant', category: 'ingredient_attribute' },
  { key: 'NEUTRALISANT_ACIDE', slug: 'neutralisant-acide', category: 'ingredient_attribute' },
  { key: 'FLUORURE', slug: 'fluorure', category: 'ingredient_attribute' },
  { key: 'DESENSIBILISANT', slug: 'desensibilisant', category: 'ingredient_attribute' },
  { key: 'ANTI_INFLAMMATOIRE', slug: 'anti-inflammatoire', category: 'ingredient_attribute' },

  // Dental effect
  { key: 'FRAICHEUR', slug: 'fraicheur', category: 'dental_effect' },
  { key: 'BLANCHEUR', slug: 'blancheur', category: 'dental_effect' },
  { key: 'APAISEMENT_GENCIVES', slug: 'apaisement-gencives', category: 'dental_effect' },
  { key: 'RENFORCEMENT_EMAIL', slug: 'renforcement-email', category: 'dental_effect' },
  { key: 'REDUCTION_SENSIBILITE', slug: 'reduction-sensibilite', category: 'dental_effect' },
] as const satisfies readonly TagDef<DentalIngredientTagCategory>[]

export const DENTAL_INGREDIENT_TAG_SLUGS = deriveTagSlugs(DENTAL_INGREDIENT_TAG_DEFS)

export type DentalIngredientTagSlug =
  (typeof DENTAL_INGREDIENT_TAG_SLUGS)[keyof typeof DENTAL_INGREDIENT_TAG_SLUGS]
