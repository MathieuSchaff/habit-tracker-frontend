export const PRODUCT_UNITS = {
  PUMP: 'pump',
  DROPPER: 'dropper',
  TUBE: 'tube',
  JAR: 'jar',
  SPRAY: 'spray',
  AEROSOL: 'aerosol',
  BOTTLE: 'bottle',
  ROLLER: 'roller',
  PACK: 'pack',
  CARTRIDGE: 'cartridge',
  BAR: 'bar',
} as const

export type ProductUnit = (typeof PRODUCT_UNITS)[keyof typeof PRODUCT_UNITS]

export const PRODUCT_UNIT_VALUES = Object.values(PRODUCT_UNITS) as [ProductUnit, ...ProductUnit[]]
