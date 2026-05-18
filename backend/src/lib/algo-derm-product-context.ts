import type { ProductKind } from '@habit-tracker/shared'

import type { ProductContext } from 'algo-derm'

type AlgoDermFormulaType = NonNullable<ProductContext['formulaType']>

// Aurore ProductKind covers categories beyond skincare (haircare, dental, etc).
// algo-derm only knows skincare formula types — non-skincare kinds get undefined,
// which falls back to the engine's neutral prior.
const KIND_TO_FORMULA: Partial<Record<ProductKind, AlgoDermFormulaType>> = {
  serum: 'serum',
  moisturizer: 'cream',
  cleanser: 'cleanser',
  toner: 'lotion',
  exfoliant: 'serum',
  'eye-cream': 'cream',
  mask: 'cream',
  mist: 'lotion',
  essence: 'serum',
  'spot-treatment': 'serum',
  balm: 'cream',
  oil: 'serum',
  primer: 'cream',
  sunscreen: 'sunscreen',
  'after-sun': 'sunscreen',
  'self-tanner': 'sunscreen',
}

// Rinse-off changes the exposure multiplier inside algo-derm.
// Masks are kept leave-on by default (skincare bias); rinse-off masks are rare.
export const RINSE_OFF_KINDS: ReadonlySet<ProductKind> = new Set<ProductKind>([
  'cleanser',
  'shampoo',
  'conditioner',
  'body-wash',
  'body-scrub',
  'mouthwash',
])

export function mapKindToContext(kind: ProductKind): ProductContext {
  return {
    leaveOn: !RINSE_OFF_KINDS.has(kind),
    formulaType: KIND_TO_FORMULA[kind],
  }
}
