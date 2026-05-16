import type { ProductCategory } from './kinds'

// Product Units per Category

export const PRODUCT_UNITS = {
  skincare: {
    PUMP: 'pump',
    DROPPER: 'dropper',
    JAR: 'jar',
    TUBE: 'tube',
    BOTTLE: 'bottle',
    SPRAY: 'spray',
    PACK: 'pack',
    ROLLER: 'roller',
    BAR: 'bar',
  },
  solaire: {
    TUBE: 'tube',
    SPRAY: 'spray',
    AEROSOL: 'aerosol',
    BOTTLE: 'bottle',
    PUMP: 'pump',
    STICK: 'stick',
  },
  haircare: {
    BOTTLE: 'bottle',
    TUBE: 'tube',
    PUMP: 'pump',
    SPRAY: 'spray',
    JAR: 'jar',
    SACHET: 'sachet',
    CARTRIDGE: 'cartridge',
  },
  bodycare: {
    TUBE: 'tube',
    BOTTLE: 'bottle',
    PUMP: 'pump',
    JAR: 'jar',
    BAR: 'bar',
    SPRAY: 'spray',
    STICK: 'stick',
  },
  dental: {
    TUBE: 'tube',
    PACK: 'pack',
    BOTTLE: 'bottle',
    SPRAY: 'spray',
  },
  complement: {
    TABLET: 'tablet',
    CAPSULE: 'capsule',
    GUMMY: 'gummy',
    SACHET: 'sachet',
    POWDER: 'powder',
    BOTTLE: 'bottle',
    STICK: 'stick',
    AMPOULE: 'ampoule',
  },
} as const

export type ProductUnitsMap = typeof PRODUCT_UNITS
export type ProductUnit = {
  [C in keyof ProductUnitsMap]: (typeof PRODUCT_UNITS)[C][keyof (typeof PRODUCT_UNITS)[C]]
}[keyof ProductUnitsMap]

const _flat = Object.values(PRODUCT_UNITS).flatMap(
  (domain) => Object.values(domain) as ProductUnit[]
)
export const PRODUCT_UNIT_VALUES = Array.from(new Set(_flat)) as [ProductUnit, ...ProductUnit[]]

export const PRODUCT_UNIT_LABELS: Record<ProductUnit, string> = {
  // format/applicator
  pump: 'Pompe',
  dropper: 'Compte-gouttes',
  jar: 'Pot',
  tube: 'Tube',
  bottle: 'Flacon',
  spray: 'Spray',
  pack: 'Pack',
  roller: 'Roller',
  bar: 'Pain',
  aerosol: 'Aérosol',
  stick: 'Stick',
  sachet: 'Sachet',
  cartridge: 'Cartouche',
  // complement forms
  tablet: 'Comprimé',
  capsule: 'Capsule',
  gummy: 'Gummies',
  powder: 'Poudre',
  ampoule: 'Ampoule',
}

// Product Amount Units (contenance — measurement of totalAmount)

export const PRODUCT_AMOUNT_UNIT_VALUES = [
  'ml',
  'g',
  'oz',
  'mg',
  'capsule',
  'tablet',
  'gummy',
  'sachet',
  'ampoule',
] as const

export type ProductAmountUnit = (typeof PRODUCT_AMOUNT_UNIT_VALUES)[number]

export const PRODUCT_AMOUNT_UNITS: Record<ProductCategory, readonly ProductAmountUnit[]> = {
  skincare: ['ml', 'g', 'oz'],
  solaire: ['ml', 'g'],
  haircare: ['ml', 'g'],
  bodycare: ['ml', 'g', 'oz'],
  dental: ['ml', 'g'],
  complement: ['capsule', 'tablet', 'gummy', 'sachet', 'ampoule', 'g', 'mg', 'ml'],
}

export const PRODUCT_AMOUNT_UNIT_LABELS: Record<ProductAmountUnit, string> = {
  ml: 'mL',
  g: 'g',
  oz: 'oz',
  mg: 'mg',
  capsule: 'capsules',
  tablet: 'comprimés',
  gummy: 'gummies',
  sachet: 'sachets',
  ampoule: 'ampoules',
}

// Concentration Units (active ingredient dose in a product)

export const PRODUCT_CONCENTRATION_UNIT_VALUES = ['%', 'IU', 'mg', 'mcg', 'mg/mL'] as const

export type ProductConcentrationUnit = (typeof PRODUCT_CONCENTRATION_UNIT_VALUES)[number]

export const PRODUCT_CONCENTRATION_UNIT_LABELS: Record<ProductConcentrationUnit, string> = {
  '%': '%',
  IU: 'UI',
  mg: 'mg',
  mcg: 'µg',
  'mg/mL': 'mg/mL',
}
