// Product Categories

const PRODUCT_CATEGORIES = {
  SKINCARE: 'skincare',
  SOLAIRE: 'solaire',
  COMPLEMENT: 'complement',
  HAIRCARE: 'haircare',
  BODYCARE: 'bodycare',
  DENTAL: 'dental',
} as const

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[keyof typeof PRODUCT_CATEGORIES]

// For Zod enum validation
export const PRODUCT_CATEGORY_VALUES = Object.values(PRODUCT_CATEGORIES) as [
  ProductCategory,
  ...ProductCategory[],
]

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  skincare: 'Soin visage',
  haircare: 'Cheveux',
  dental: 'Dents',
  solaire: 'Solaire',
  complement: 'Compléments',
  bodycare: 'Corps',
}

// Product Kinds per Category

export const PRODUCT_KINDS = {
  skincare: {
    SERUM: 'serum',
    MOISTURIZER: 'moisturizer',
    CLEANSER: 'cleanser',
    TONER: 'toner',
    EXFOLIANT: 'exfoliant',
    EYE_CREAM: 'eye-cream',
    MASK: 'mask',
    MIST: 'mist',
    ESSENCE: 'essence',
    SPOT_TREATMENT: 'spot-treatment',
    LIP_CARE: 'lip-care',
    BALM: 'balm',
    OIL: 'oil',
    PRIMER: 'primer',
    PATCH: 'patch',
  },
  solaire: {
    SUNSCREEN: 'sunscreen',
    AFTER_SUN: 'after-sun',
    SELF_TANNER: 'self-tanner',
  },
  complement: {
    GELULE: 'gelule',
    CAPSULE: 'capsule',
    AMPOULE: 'ampoule',
    POUDRE: 'poudre',
    SIROP: 'sirop',
    GUMMY: 'gummy',
    HUILE: 'huile',
  },
  haircare: {
    SHAMPOO: 'shampoo',
    CONDITIONER: 'conditioner',
    HAIR_MASK: 'hair-mask',
    HAIR_SERUM: 'hair-serum',
    HAIR_OIL: 'hair-oil',
    STYLING: 'styling',
  },
  bodycare: {
    BODY_LOTION: 'body-lotion',
    BODY_OIL: 'body-oil',
    BODY_SCRUB: 'body-scrub',
    BODY_WASH: 'body-wash',
    DEODORANT: 'deodorant',
    HAND_CREAM: 'hand-cream',
    FOOT_CREAM: 'foot-cream',
  },
  dental: {
    TOOTHPASTE: 'toothpaste',
    MOUTHWASH: 'mouthwash',
    TEETH_WHITENING: 'teeth-whitening',
    FLOSS: 'floss',
  },
} as const

export type ProductKindsMap = typeof PRODUCT_KINDS
export type ProductKind = {
  [C in keyof ProductKindsMap]: (typeof PRODUCT_KINDS)[C][keyof (typeof PRODUCT_KINDS)[C]]
}[keyof ProductKindsMap]

// FR labels per kind slug. Consumed by frontend filters and product cards
// to avoid showing raw slugs (`hair-serum`, `body-lotion`) to end users.
export const PRODUCT_KIND_LABELS: Record<ProductKind, string> = {
  // skincare
  serum: 'Sérum',
  moisturizer: 'Crème hydratante',
  cleanser: 'Nettoyant',
  toner: 'Lotion tonique',
  exfoliant: 'Exfoliant',
  'eye-cream': 'Contour des yeux',
  mask: 'Masque',
  mist: 'Brume',
  essence: 'Essence',
  'spot-treatment': 'Soin ciblé',
  'lip-care': 'Soin lèvres',
  balm: 'Baume',
  oil: 'Huile',
  primer: 'Base lissante',
  patch: 'Patch',
  // solaire
  sunscreen: 'Solaire',
  'after-sun': 'Après-soleil',
  'self-tanner': 'Autobronzant',
  // complement
  gelule: 'Gélule',
  capsule: 'Capsule',
  ampoule: 'Ampoule',
  poudre: 'Poudre',
  sirop: 'Sirop',
  gummy: 'Gummies',
  huile: 'Huile',
  // haircare
  shampoo: 'Shampooing',
  conditioner: 'Après-shampooing',
  'hair-mask': 'Masque capillaire',
  'hair-serum': 'Sérum capillaire',
  'hair-oil': 'Huile capillaire',
  styling: 'Coiffant',
  // bodycare
  'body-lotion': 'Lait corps',
  'body-oil': 'Huile corps',
  'body-scrub': 'Gommage corps',
  'body-wash': 'Gel douche',
  deodorant: 'Déodorant',
  'hand-cream': 'Crème mains',
  'foot-cream': 'Crème pieds',
  // dental
  toothpaste: 'Dentifrice',
  mouthwash: 'Bain de bouche',
  'teeth-whitening': 'Blanchiment',
  floss: 'Fil dentaire',
}

export function getProductKindLabel(kind: string): string {
  return PRODUCT_KIND_LABELS[kind as ProductKind] ?? kind
}
