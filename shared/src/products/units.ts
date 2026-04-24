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
