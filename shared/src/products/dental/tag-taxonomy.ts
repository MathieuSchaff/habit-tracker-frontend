import { DENTAL_PRODUCT_TAG_SLUGS, type DentalProductTagSlug } from './tag-slugs'

export const DENTAL_PRODUCT_TAG_CATEGORIES = [
  'concern',
  'age_group',
  'product_type',
  'dental_effect',
  'product_label',
] as const

export type DentalProductTagCategory = (typeof DENTAL_PRODUCT_TAG_CATEGORIES)[number]

export interface DentalProductTagMeta {
  category: DentalProductTagCategory
}

const CONCERN: DentalProductTagSlug[] = [
  DENTAL_PRODUCT_TAG_SLUGS.CARIE,
  DENTAL_PRODUCT_TAG_SLUGS.SENSIBILITE_DENTINAIRE,
  DENTAL_PRODUCT_TAG_SLUGS.HALITOSE,
  DENTAL_PRODUCT_TAG_SLUGS.GENCIVITE,
  DENTAL_PRODUCT_TAG_SLUGS.PLAQUE,
  DENTAL_PRODUCT_TAG_SLUGS.TACHES,
  DENTAL_PRODUCT_TAG_SLUGS.TARTRE,
  DENTAL_PRODUCT_TAG_SLUGS.EMAIL_AFFAIBLI,
  DENTAL_PRODUCT_TAG_SLUGS.SECHERESSE_BUCCALE,
]

const AGE_GROUP: DentalProductTagSlug[] = [
  DENTAL_PRODUCT_TAG_SLUGS.ADULTE,
  DENTAL_PRODUCT_TAG_SLUGS.ENFANT,
  DENTAL_PRODUCT_TAG_SLUGS.ADO,
  DENTAL_PRODUCT_TAG_SLUGS.ORTHODONTIE,
  DENTAL_PRODUCT_TAG_SLUGS.SENIOR,
]

const PRODUCT_TYPE: DentalProductTagSlug[] = [
  DENTAL_PRODUCT_TAG_SLUGS.DENTIFRICE,
  DENTAL_PRODUCT_TAG_SLUGS.BAIN_DE_BOUCHE,
  DENTAL_PRODUCT_TAG_SLUGS.FIL_DENTAIRE,
  DENTAL_PRODUCT_TAG_SLUGS.BROSSETTE,
  DENTAL_PRODUCT_TAG_SLUGS.KIT_BLANCHIMENT,
]

const DENTAL_EFFECT: DentalProductTagSlug[] = [
  DENTAL_PRODUCT_TAG_SLUGS.FRAICHEUR,
  DENTAL_PRODUCT_TAG_SLUGS.BLANCHEUR,
  DENTAL_PRODUCT_TAG_SLUGS.RENFORCEMENT_EMAIL,
  DENTAL_PRODUCT_TAG_SLUGS.ANTI_PLAQUE,
  DENTAL_PRODUCT_TAG_SLUGS.REMINERALISATION,
  DENTAL_PRODUCT_TAG_SLUGS.APAISEMENT_GENCIVES,
]

const PRODUCT_LABEL: DentalProductTagSlug[] = [
  DENTAL_PRODUCT_TAG_SLUGS.SANS_FLUOR,
  DENTAL_PRODUCT_TAG_SLUGS.SANS_SLS,
  DENTAL_PRODUCT_TAG_SLUGS.SANS_EDULCORANTS_ARTIFICIELS,
  DENTAL_PRODUCT_TAG_SLUGS.VEGAN,
  DENTAL_PRODUCT_TAG_SLUGS.BIO,
]

type Entry = [DentalProductTagSlug, DentalProductTagMeta]

const entries: Entry[] = [
  ...CONCERN.map((s): Entry => [s, { category: 'concern' }]),
  ...AGE_GROUP.map((s): Entry => [s, { category: 'age_group' }]),
  ...PRODUCT_TYPE.map((s): Entry => [s, { category: 'product_type' }]),
  ...DENTAL_EFFECT.map((s): Entry => [s, { category: 'dental_effect' }]),
  ...PRODUCT_LABEL.map((s): Entry => [s, { category: 'product_label' }]),
]

export const DENTAL_PRODUCT_TAG_TAXONOMY = Object.fromEntries(entries) as Record<
  DentalProductTagSlug,
  DentalProductTagMeta
>

export function getDentalProductTagCategory(
  slug: DentalProductTagSlug
): DentalProductTagCategory | undefined {
  return DENTAL_PRODUCT_TAG_TAXONOMY[slug]?.category
}
