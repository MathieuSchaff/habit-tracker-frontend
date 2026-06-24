// Supplement Ingredient Tag definitions — single source of truth.
// One {key, slug, category} per tag (ingredient labels live in the seed, not
// shared); the legacy *_TAG_SLUGS object and the {category} taxonomy are derived.
// Tags applicable to supplement/nutraceutical ingredients.
// Categories: goal, moment, restriction, ingredient_attribute.

import { deriveTagSlugs, type TagDef } from '../../tag-api/tag-taxonomy-builder'

export const SUPPLEMENT_INGREDIENT_TAG_CATEGORIES = [
  'goal',
  'moment',
  'restriction',
  'ingredient_attribute',
] as const

export type SupplementIngredientTagCategory = (typeof SUPPLEMENT_INGREDIENT_TAG_CATEGORIES)[number]

export const SUPPLEMENT_INGREDIENT_TAG_DEFS = [
  // Goals
  { key: 'SOMMEIL', slug: 'sommeil', category: 'goal' },
  { key: 'ENERGIE', slug: 'energie', category: 'goal' },
  { key: 'COGNITION', slug: 'cognition', category: 'goal' },
  { key: 'MEMOIRE', slug: 'memoire', category: 'goal' },
  { key: 'FOCUS', slug: 'focus', category: 'goal' },
  { key: 'IMMUNITE', slug: 'immunite', category: 'goal' },
  { key: 'LONGEVITE', slug: 'longevite', category: 'goal' },
  { key: 'STRESS', slug: 'stress', category: 'goal' },
  { key: 'ANXIETE', slug: 'anxiete', category: 'goal' },
  { key: 'SPORT_PERFORMANCE', slug: 'sport-performance', category: 'goal' },
  { key: 'SPORT_RECUPERATION', slug: 'sport-recuperation', category: 'goal' },
  { key: 'ARTICULATIONS', slug: 'articulations', category: 'goal' },
  { key: 'DIGESTION', slug: 'digestion', category: 'goal' },
  { key: 'CARDIOVASCULAIRE', slug: 'cardiovasculaire', category: 'goal' },
  { key: 'HORMONAL', slug: 'hormonal', category: 'goal' },
  { key: 'OS', slug: 'os', category: 'goal' },
  { key: 'VISION', slug: 'vision', category: 'goal' },
  { key: 'DETOX', slug: 'detox', category: 'goal' },
  // -orale suffix distinguishes from skincare topical equivalents
  { key: 'PEAU_ORALE', slug: 'peau-orale', category: 'goal' },
  { key: 'CHEVEUX_ORALE', slug: 'cheveux-orale', category: 'goal' },

  // Moment
  { key: 'MATIN', slug: 'matin', category: 'moment' },
  { key: 'SOIR', slug: 'soir', category: 'moment' },
  { key: 'AVEC_REPAS', slug: 'avec-repas', category: 'moment' },
  { key: 'A_JEUN', slug: 'a-jeun', category: 'moment' },
  { key: 'PRE_ENTRAINEMENT', slug: 'pre-entrainement', category: 'moment' },
  { key: 'POST_ENTRAINEMENT', slug: 'post-entrainement', category: 'moment' },

  // Restriction
  { key: 'GROSSESSE_INCOMPATIBLE', slug: 'grossesse-incompatible', category: 'restriction' },
  { key: 'ALLAITEMENT_INCOMPATIBLE', slug: 'allaitement-incompatible', category: 'restriction' },
  { key: 'ENFANT_NON_ADAPTE', slug: 'enfant-non-adapte', category: 'restriction' },
  {
    key: 'INTERACTION_ANTICOAGULANTS',
    slug: 'interaction-anticoagulants',
    category: 'restriction',
  },
  { key: 'INSUFFISANCE_HEPATIQUE', slug: 'insuffisance-hepatique', category: 'restriction' },
  { key: 'INSUFFISANCE_RENALE', slug: 'insuffisance-renale', category: 'restriction' },

  // Ingredient attribute (biochemical)
  { key: 'ANTIOXYDANT', slug: 'antioxydant', category: 'ingredient_attribute' },
  { key: 'ADAPTOGENE', slug: 'adaptogene', category: 'ingredient_attribute' },
  { key: 'NOOTROPE', slug: 'nootrope', category: 'ingredient_attribute' },
  { key: 'ANTI_INFLAMMATOIRE', slug: 'anti-inflammatoire', category: 'ingredient_attribute' },
  { key: 'IMMUNO_MODULATEUR', slug: 'immuno-modulateur', category: 'ingredient_attribute' },
  {
    key: 'PRECURSEUR_NEUROTRANSMETTEUR',
    slug: 'precurseur-neurotransmetteur',
    category: 'ingredient_attribute',
  },
  { key: 'DONNEUR_METHYLE', slug: 'donneur-methyle', category: 'ingredient_attribute' },
  { key: 'COFACTEUR_ENZYMATIQUE', slug: 'cofacteur-enzymatique', category: 'ingredient_attribute' },
  { key: 'STIMULANT', slug: 'stimulant', category: 'ingredient_attribute' },
  { key: 'CALMANT', slug: 'calmant', category: 'ingredient_attribute' },
] as const satisfies readonly TagDef<SupplementIngredientTagCategory>[]

export const SUPPLEMENT_INGREDIENT_TAG_SLUGS = deriveTagSlugs(SUPPLEMENT_INGREDIENT_TAG_DEFS)

export type SupplementIngredientTagSlug =
  (typeof SUPPLEMENT_INGREDIENT_TAG_SLUGS)[keyof typeof SUPPLEMENT_INGREDIENT_TAG_SLUGS]
