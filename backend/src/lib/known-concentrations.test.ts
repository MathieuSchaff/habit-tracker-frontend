import { describe, expect, test } from 'bun:test'

import { buildKnownConcentrations } from './known-concentrations'

// Pure: rows from product_ingredients → algo-derm knownConcentrations map.
// Keyed by ingredient NAME (algo-derm normalize() + FR→Latin translates it to
// match an INCI token); slug would fail because normalize keeps hyphens.
describe('buildKnownConcentrations', () => {
  test('keeps % rows with a finite positive value, keyed by name', () => {
    const map = buildKnownConcentrations([
      { name: 'Niacinamide', concentrationValue: '10', concentrationUnit: '%' },
    ])
    expect(map).toEqual({ Niacinamide: 10 })
  })

  test('coerces numeric-string concentration values', () => {
    const map = buildKnownConcentrations([
      { name: 'Azelaic Acid', concentrationValue: '15.5', concentrationUnit: '%' },
    ])
    expect(map['Azelaic Acid']).toBe(15.5)
  })

  test('drops rows whose unit is not %', () => {
    const map = buildKnownConcentrations([
      { name: 'Retinol', concentrationValue: '5000', concentrationUnit: 'IU' },
      { name: 'Zinc', concentrationValue: '15', concentrationUnit: 'mg' },
    ])
    expect(map).toEqual({})
  })

  test('drops null and non-finite values', () => {
    const map = buildKnownConcentrations([
      { name: 'A', concentrationValue: null, concentrationUnit: '%' },
      { name: 'B', concentrationValue: 'not-a-number', concentrationUnit: '%' },
    ])
    expect(map).toEqual({})
  })

  test('drops out-of-range values (≤0 or >100)', () => {
    const map = buildKnownConcentrations([
      { name: 'Zero', concentrationValue: '0', concentrationUnit: '%' },
      { name: 'Negative', concentrationValue: '-3', concentrationUnit: '%' },
      { name: 'TooHigh', concentrationValue: '150', concentrationUnit: '%' },
    ])
    expect(map).toEqual({})
  })

  test('merges multiple valid rows', () => {
    const map = buildKnownConcentrations([
      { name: 'Niacinamide', concentrationValue: '10', concentrationUnit: '%' },
      { name: 'Salicylic Acid', concentrationValue: '2', concentrationUnit: '%' },
    ])
    expect(map).toEqual({ Niacinamide: 10, 'Salicylic Acid': 2 })
  })

  test('also emits a spaced-slug key (algo-derm normalize keeps hyphens)', () => {
    // The slug ("salicylic-acid") is English INCI-ish and binds actives whose
    // French name ("Acide Salicylique") never matches the INCI token. Hyphens
    // become spaces so algo-derm normalize() yields the spaced INCI form.
    const map = buildKnownConcentrations([
      {
        name: 'Acide Salicylique',
        slug: 'salicylic-acid',
        concentrationValue: '2',
        concentrationUnit: '%',
      },
    ])
    expect(map['Acide Salicylique']).toBe(2)
    expect(map['salicylic acid']).toBe(2)
  })

  test('omits slug key when slug is absent', () => {
    const map = buildKnownConcentrations([
      { name: 'Niacinamide', concentrationValue: '10', concentrationUnit: '%' },
    ])
    expect(map).toEqual({ Niacinamide: 10 })
  })

  test('empty input → empty map', () => {
    expect(buildKnownConcentrations([])).toEqual({})
  })

  test('returns undefined-free object even when all rows drop', () => {
    const map = buildKnownConcentrations([
      { name: 'X', concentrationValue: null, concentrationUnit: 'IU' },
    ])
    expect(Object.keys(map)).toHaveLength(0)
  })
})
