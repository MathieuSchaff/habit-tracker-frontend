// Dental Ingredient Tag definitions — single source of truth.
// One {key, slug, label, category} per tag; the legacy *_TAG_SLUGS object, the
// {category} taxonomy and the slug->label map are derived.

import { deriveTagSlugs, type LabeledTagDef } from '../../tag-api/tag-taxonomy-builder'

export const DENTAL_INGREDIENT_TAG_CATEGORIES = [
  'concern',
  'age_group',
  'ingredient_attribute',
  'dental_effect',
] as const

export type DentalIngredientTagCategory = (typeof DENTAL_INGREDIENT_TAG_CATEGORIES)[number]

export const DENTAL_INGREDIENT_TAG_DEFS = [
  // Concerns
  { key: 'CARIE', slug: 'carie', label: 'Carie', category: 'concern' },
  {
    key: 'SENSIBILITE_DENTINAIRE',
    slug: 'sensibilite-dentinaire',
    label: 'Sensibilité dentinaire',
    category: 'concern',
  },
  { key: 'GENCIVITE', slug: 'gencivite', label: 'Gingivite', category: 'concern' },
  { key: 'PARODONTITE', slug: 'parodontite', label: 'Parodontite', category: 'concern' },
  { key: 'PLAQUE', slug: 'plaque', label: 'Plaque', category: 'concern' },
  { key: 'TARTRE', slug: 'tartre', label: 'Tartre', category: 'concern' },
  { key: 'TACHES', slug: 'taches', label: 'Taches', category: 'concern' },
  { key: 'EROSION_ACIDE', slug: 'erosion-acide', label: 'Érosion acide', category: 'concern' },
  { key: 'HALITOSE', slug: 'halitose', label: 'Halitose', category: 'concern' },
  { key: 'BRUXISME', slug: 'bruxisme', label: 'Bruxisme', category: 'concern' },
  { key: 'APHTES', slug: 'aphtes', label: 'Aphtes', category: 'concern' },

  // Age group
  { key: 'ADULTE', slug: 'adulte', label: 'Adulte', category: 'age_group' },
  { key: 'ENFANT', slug: 'enfant', label: 'Enfant', category: 'age_group' },
  { key: 'SENIOR', slug: 'senior', label: 'Senior', category: 'age_group' },
  { key: 'ORTHODONTIE', slug: 'orthodontie', label: 'Orthodontie', category: 'age_group' },
  { key: 'IMPLANTS', slug: 'implants', label: 'Implants', category: 'age_group' },
  { key: 'DENTS_LAIT', slug: 'dents-lait', label: 'Dents de lait', category: 'age_group' },

  // Ingredient attribute (biochemical)
  {
    key: 'REMINERALISANT',
    slug: 'remineralisant',
    label: 'Reminéralisant',
    category: 'ingredient_attribute',
  },
  {
    key: 'ANTIBACTERIEN',
    slug: 'antibacterien',
    label: 'Antibactérien',
    category: 'ingredient_attribute',
  },
  {
    key: 'ANTI_PLAQUE',
    slug: 'anti-plaque',
    label: 'Anti-plaque',
    category: 'ingredient_attribute',
  },
  {
    key: 'ANTI_TARTRE',
    slug: 'anti-tartre',
    label: 'Anti-tartre',
    category: 'ingredient_attribute',
  },
  {
    key: 'ABRASIF_DOUX',
    slug: 'abrasif-doux',
    label: 'Abrasif doux',
    category: 'ingredient_attribute',
  },
  {
    key: 'ABRASIF_FORT',
    slug: 'abrasif-fort',
    label: 'Abrasif fort',
    category: 'ingredient_attribute',
  },
  {
    key: 'BLANCHISSANT',
    slug: 'blanchissant',
    label: 'Blanchissant',
    category: 'ingredient_attribute',
  },
  {
    key: 'NEUTRALISANT_ACIDE',
    slug: 'neutralisant-acide',
    label: 'Neutralisant acide',
    category: 'ingredient_attribute',
  },
  { key: 'FLUORURE', slug: 'fluorure', label: 'Fluorure', category: 'ingredient_attribute' },
  {
    key: 'DESENSIBILISANT',
    slug: 'desensibilisant',
    label: 'Désensibilisant',
    category: 'ingredient_attribute',
  },
  {
    key: 'ANTI_INFLAMMATOIRE',
    slug: 'anti-inflammatoire',
    label: 'Anti-inflammatoire',
    category: 'ingredient_attribute',
  },

  // Dental effect
  { key: 'FRAICHEUR', slug: 'fraicheur', label: 'Fraîcheur', category: 'dental_effect' },
  { key: 'BLANCHEUR', slug: 'blancheur', label: 'Blancheur', category: 'dental_effect' },
  {
    key: 'APAISEMENT_GENCIVES',
    slug: 'apaisement-gencives',
    label: 'Apaisement gencives',
    category: 'dental_effect',
  },
  {
    key: 'RENFORCEMENT_EMAIL',
    slug: 'renforcement-email',
    label: 'Renforcement de l’émail',
    category: 'dental_effect',
  },
  {
    key: 'REDUCTION_SENSIBILITE',
    slug: 'reduction-sensibilite',
    label: 'Réduction de la sensibilité',
    category: 'dental_effect',
  },
] as const satisfies readonly LabeledTagDef<DentalIngredientTagCategory>[]

export const DENTAL_INGREDIENT_TAG_SLUGS = deriveTagSlugs(DENTAL_INGREDIENT_TAG_DEFS)

export type DentalIngredientTagSlug =
  (typeof DENTAL_INGREDIENT_TAG_SLUGS)[keyof typeof DENTAL_INGREDIENT_TAG_SLUGS]
