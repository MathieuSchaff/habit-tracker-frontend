// Product Categories

export const PRODUCT_CATEGORIES = {
  SKINCARE: 'skincare',
  SOLAIRE: 'solaire',
  COMPLEMENT: 'complément',
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
  complément: {
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
