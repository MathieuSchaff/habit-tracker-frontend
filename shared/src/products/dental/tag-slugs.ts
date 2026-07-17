// Dental Product Tag definitions — single source of truth.
// One {key, slug, label, category} per tag; the legacy *_TAG_SLUGS object and
// the taxonomy (tag-taxonomy.ts) are derived from this array.
//
// concern / age_group / dental_effect: slugs aligned with
// DENTAL_INGREDIENT_TAG_SLUGS when the meaning is shared (independent DB rows,
// scope `both` inferred — cross-entity consistency, same pattern as skincare).
// product_type / product_label: new slugs, product scope.
//
// Note `gencivite` / `taches`: spelling preserved to align with the
// existing ingredient slugs (typo `gencivite` vs correct `gingivite`).

import { deriveTagSlugs, type ProductTagDef } from '../../tag-taxonomy-builder'

export const DENTAL_PRODUCT_TAG_CATEGORIES = [
  'concern',
  'age_group',
  'product_type',
  'dental_effect',
  'product_label',
] as const

export type DentalProductTagCategory = (typeof DENTAL_PRODUCT_TAG_CATEGORIES)[number]

export const DENTAL_PRODUCT_TAG_DEFS = [
  // Concerns
  { key: 'CARIE', slug: 'carie', label: 'Carie', category: 'concern' },
  {
    key: 'SENSIBILITE_DENTINAIRE',
    slug: 'sensibilite-dentinaire',
    label: 'Sensibilité dentinaire',
    category: 'concern',
  },
  { key: 'HALITOSE', slug: 'halitose', label: 'Halitose', category: 'concern' },
  { key: 'GENCIVITE', slug: 'gencivite', label: 'Gingivite', category: 'concern' },
  { key: 'PLAQUE', slug: 'plaque', label: 'Plaque', category: 'concern' },
  { key: 'TACHES', slug: 'taches', label: 'Taches', category: 'concern' },
  { key: 'TARTRE', slug: 'tartre', label: 'Tartre', category: 'concern' },
  { key: 'EMAIL_AFFAIBLI', slug: 'email-affaibli', label: 'Émail affaibli', category: 'concern' },
  {
    key: 'SECHERESSE_BUCCALE',
    slug: 'secheresse-buccale',
    label: 'Sécheresse buccale',
    category: 'concern',
  },

  // Age group
  { key: 'ADULTE', slug: 'adulte', label: 'Adulte', category: 'age_group' },
  { key: 'ENFANT', slug: 'enfant', label: 'Enfant', category: 'age_group' },
  { key: 'ADO', slug: 'ado', label: 'Ado', category: 'age_group' },
  { key: 'ORTHODONTIE', slug: 'orthodontie', label: 'Orthodontie', category: 'age_group' },
  { key: 'SENIOR', slug: 'senior', label: 'Senior', category: 'age_group' },

  // Product types
  { key: 'DENTIFRICE', slug: 'dentifrice', label: 'Dentifrice', category: 'product_type' },
  {
    key: 'BAIN_DE_BOUCHE',
    slug: 'bain-de-bouche',
    label: 'Bain de bouche',
    category: 'product_type',
  },
  { key: 'FIL_DENTAIRE', slug: 'fil-dentaire', label: 'Fil dentaire', category: 'product_type' },
  { key: 'BROSSETTE', slug: 'brossette', label: 'Brossette', category: 'product_type' },
  {
    key: 'KIT_BLANCHIMENT',
    slug: 'kit-blanchiment',
    label: 'Kit blanchiment',
    category: 'product_type',
  },

  // Dental effect
  { key: 'FRAICHEUR', slug: 'fraicheur', label: 'Fraîcheur', category: 'dental_effect' },
  { key: 'BLANCHEUR', slug: 'blancheur', label: 'Blancheur', category: 'dental_effect' },
  {
    key: 'RENFORCEMENT_EMAIL',
    slug: 'renforcement-email',
    label: 'Renforcement de l’émail',
    category: 'dental_effect',
  },
  { key: 'ANTI_PLAQUE', slug: 'anti-plaque', label: 'Anti-plaque', category: 'dental_effect' },
  {
    key: 'REMINERALISATION',
    slug: 'remineralisation',
    label: 'Reminéralisation',
    category: 'dental_effect',
  },
  {
    key: 'APAISEMENT_GENCIVES',
    slug: 'apaisement-gencives',
    label: 'Apaisement gencives',
    category: 'dental_effect',
  },

  // Product labels
  { key: 'SANS_FLUOR', slug: 'sans-fluor', label: 'Sans fluor', category: 'product_label' },
  { key: 'SANS_SLS', slug: 'sans-sls', label: 'Sans SLS', category: 'product_label' },
  {
    key: 'SANS_EDULCORANTS_ARTIFICIELS',
    slug: 'sans-edulcorants-artificiels',
    label: 'Sans édulcorants artificiels',
    category: 'product_label',
  },
  { key: 'BIO', slug: 'bio', label: 'Bio', category: 'product_label' },
] as const satisfies readonly ProductTagDef<DentalProductTagCategory>[]

export const DENTAL_PRODUCT_TAG_SLUGS = deriveTagSlugs(DENTAL_PRODUCT_TAG_DEFS)

export type DentalProductTagSlug =
  (typeof DENTAL_PRODUCT_TAG_SLUGS)[keyof typeof DENTAL_PRODUCT_TAG_SLUGS]
