import { describe, expect, it } from 'bun:test'

import type { ProductKind } from '@aurore/shared'

import { mapKindToContext, RINSE_OFF_KINDS } from './algo-derm-product-context'

describe('mapKindToContext', () => {
  it('marks rinse-off kinds as leaveOn:false', () => {
    const rinseOff: ProductKind[] = [
      'cleanser',
      'shampoo',
      'conditioner',
      'body-wash',
      'body-scrub',
      'mouthwash',
      'toothpaste',
    ]
    for (const kind of rinseOff) {
      expect(mapKindToContext(kind).leaveOn).toBe(false)
    }
  })

  // Regression guard for B4: toothpaste is applied-then-rinsed, must not score leave-on.
  it('treats toothpaste as rinse-off', () => {
    expect(RINSE_OFF_KINDS.has('toothpaste')).toBe(true)
    expect(mapKindToContext('toothpaste').leaveOn).toBe(false)
  })

  it('keeps leave-on kinds as leaveOn:true', () => {
    const leaveOn: ProductKind[] = ['serum', 'moisturizer', 'mask', 'sunscreen', 'toner']
    for (const kind of leaveOn) {
      expect(mapKindToContext(kind).leaveOn).toBe(true)
    }
  })

  it('maps known skincare kinds to an algo-derm formulaType', () => {
    expect(mapKindToContext('cleanser').formulaType).toBe('cleanser')
    expect(mapKindToContext('sunscreen').formulaType).toBe('sunscreen')
    expect(mapKindToContext('serum').formulaType).toBe('serum')
    expect(mapKindToContext('moisturizer').formulaType).toBe('cream')
  })

  it('leaves non-skincare kinds without a formulaType (engine neutral prior)', () => {
    expect(mapKindToContext('toothpaste').formulaType).toBeUndefined()
  })
})
