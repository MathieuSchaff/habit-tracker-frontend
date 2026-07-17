// Supplement Ingredient Tag definitions — single source of truth.
// One {key, slug, label, category} per tag; the legacy *_TAG_SLUGS object, the
// {category} taxonomy and the slug->label map are derived.
// Tags applicable to supplement/nutraceutical ingredients.
// Categories: goal, moment, restriction, ingredient_attribute.

import { deriveTagSlugs, type LabeledTagDef } from '../../tag-taxonomy-builder'

export const SUPPLEMENT_INGREDIENT_TAG_CATEGORIES = [
  'goal',
  'moment',
  'restriction',
  'ingredient_attribute',
] as const

export type SupplementIngredientTagCategory = (typeof SUPPLEMENT_INGREDIENT_TAG_CATEGORIES)[number]

export const SUPPLEMENT_INGREDIENT_TAG_DEFS = [
  // Goals
  { key: 'SOMMEIL', slug: 'sommeil', label: 'Sommeil', category: 'goal' },
  { key: 'ENERGIE', slug: 'energie', label: 'Énergie', category: 'goal' },
  { key: 'COGNITION', slug: 'cognition', label: 'Cognition', category: 'goal' },
  { key: 'MEMOIRE', slug: 'memoire', label: 'Mémoire', category: 'goal' },
  { key: 'FOCUS', slug: 'focus', label: 'Concentration', category: 'goal' },
  { key: 'IMMUNITE', slug: 'immunite', label: 'Immunité', category: 'goal' },
  { key: 'LONGEVITE', slug: 'longevite', label: 'Longévité', category: 'goal' },
  { key: 'STRESS', slug: 'stress', label: 'Stress', category: 'goal' },
  { key: 'ANXIETE', slug: 'anxiete', label: 'Anxiété', category: 'goal' },
  {
    key: 'SPORT_PERFORMANCE',
    slug: 'sport-performance',
    label: 'Sport — performance',
    category: 'goal',
  },
  {
    key: 'SPORT_RECUPERATION',
    slug: 'sport-recuperation',
    label: 'Sport — récupération',
    category: 'goal',
  },
  { key: 'ARTICULATIONS', slug: 'articulations', label: 'Articulations', category: 'goal' },
  { key: 'DIGESTION', slug: 'digestion', label: 'Digestion', category: 'goal' },
  {
    key: 'CARDIOVASCULAIRE',
    slug: 'cardiovasculaire',
    label: 'Cardiovasculaire',
    category: 'goal',
  },
  { key: 'HORMONAL', slug: 'hormonal', label: 'Équilibre hormonal', category: 'goal' },
  { key: 'OS', slug: 'os', label: 'Os', category: 'goal' },
  { key: 'VISION', slug: 'vision', label: 'Vision', category: 'goal' },
  { key: 'DETOX', slug: 'detox', label: 'Détox', category: 'goal' },
  // -orale suffix distinguishes from skincare topical equivalents
  { key: 'PEAU_ORALE', slug: 'peau-orale', label: 'Peau (voie orale)', category: 'goal' },
  { key: 'CHEVEUX_ORALE', slug: 'cheveux-orale', label: 'Cheveux (voie orale)', category: 'goal' },

  // Moment
  { key: 'MATIN', slug: 'matin', label: 'Matin', category: 'moment' },
  { key: 'SOIR', slug: 'soir', label: 'Soir', category: 'moment' },
  { key: 'AVEC_REPAS', slug: 'avec-repas', label: 'Avec repas', category: 'moment' },
  { key: 'A_JEUN', slug: 'a-jeun', label: 'À jeun', category: 'moment' },
  {
    key: 'PRE_ENTRAINEMENT',
    slug: 'pre-entrainement',
    label: 'Pré-entraînement',
    category: 'moment',
  },
  {
    key: 'POST_ENTRAINEMENT',
    slug: 'post-entrainement',
    label: 'Post-entraînement',
    category: 'moment',
  },

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
    key: 'ENFANT_NON_ADAPTE',
    slug: 'enfant-non-adapte',
    label: 'Non adapté enfant',
    category: 'restriction',
  },
  {
    key: 'INTERACTION_ANTICOAGULANTS',
    slug: 'interaction-anticoagulants',
    label: 'Interaction anticoagulants',
    category: 'restriction',
  },
  {
    key: 'INSUFFISANCE_HEPATIQUE',
    slug: 'insuffisance-hepatique',
    label: 'Insuffisance hépatique',
    category: 'restriction',
  },
  {
    key: 'INSUFFISANCE_RENALE',
    slug: 'insuffisance-renale',
    label: 'Insuffisance rénale',
    category: 'restriction',
  },

  // Ingredient attribute (biochemical)
  {
    key: 'ANTIOXYDANT',
    slug: 'antioxydant',
    label: 'Antioxydant',
    category: 'ingredient_attribute',
  },
  { key: 'ADAPTOGENE', slug: 'adaptogene', label: 'Adaptogène', category: 'ingredient_attribute' },
  { key: 'NOOTROPE', slug: 'nootrope', label: 'Nootrope', category: 'ingredient_attribute' },
  {
    key: 'ANTI_INFLAMMATOIRE',
    slug: 'anti-inflammatoire',
    label: 'Anti-inflammatoire',
    category: 'ingredient_attribute',
  },
  {
    key: 'IMMUNO_MODULATEUR',
    slug: 'immuno-modulateur',
    label: 'Immuno-modulateur',
    category: 'ingredient_attribute',
  },
  {
    key: 'PRECURSEUR_NEUROTRANSMETTEUR',
    slug: 'precurseur-neurotransmetteur',
    label: 'Précurseur neurotransmetteur',
    category: 'ingredient_attribute',
  },
  {
    key: 'DONNEUR_METHYLE',
    slug: 'donneur-methyle',
    label: 'Donneur de méthyle',
    category: 'ingredient_attribute',
  },
  {
    key: 'COFACTEUR_ENZYMATIQUE',
    slug: 'cofacteur-enzymatique',
    label: 'Cofacteur enzymatique',
    category: 'ingredient_attribute',
  },
  { key: 'STIMULANT', slug: 'stimulant', label: 'Stimulant', category: 'ingredient_attribute' },
  { key: 'CALMANT', slug: 'calmant', label: 'Calmant', category: 'ingredient_attribute' },
] as const satisfies readonly LabeledTagDef<SupplementIngredientTagCategory>[]

export const SUPPLEMENT_INGREDIENT_TAG_SLUGS = deriveTagSlugs(SUPPLEMENT_INGREDIENT_TAG_DEFS)

export type SupplementIngredientTagSlug =
  (typeof SUPPLEMENT_INGREDIENT_TAG_SLUGS)[keyof typeof SUPPLEMENT_INGREDIENT_TAG_SLUGS]
