import { describe, expect, it } from 'vitest'

import { buildListProductsQuery } from '../products'

describe('buildListProductsQuery — empty', () => {
  it('returns an empty object when no filters are set', () => {
    expect(buildListProductsQuery({})).toEqual({})
  })

  it('omits keys for undefined values', () => {
    const q = buildListProductsQuery({ brand: undefined, sort: undefined })
    expect(q).toEqual({})
  })

  it('omits empty arrays (length 0)', () => {
    expect(buildListProductsQuery({ brand: [] })).toEqual({})
  })
})

describe('buildListProductsQuery — array filters', () => {
  it('joins a single string value as-is', () => {
    expect(buildListProductsQuery({ brand: 'CeraVe' })).toEqual({ brand: 'CeraVe' })
  })

  it('joins an array of strings with commas', () => {
    expect(buildListProductsQuery({ concern: ['acne', 'anti-age'] })).toEqual({
      concern: 'acne,anti-age',
    })
  })

  it('serializes skincare tag filter keys', () => {
    const q = buildListProductsQuery({
      brand: ['A'],
      skin_type: ['peau-grasse'],
      skin_zone: ['visage'],
      product_type: ['serum'],
      concern: ['acne'],
      skin_effect: ['matifiant'],
      product_characteristic: ['vegan', 'non-comedogene'],
      routine_step: ['matin'],
      ingredient: ['niacinamide'],
      avoid_for: ['peau-sensible'],
    })
    expect(q).toEqual({
      brand: 'A',
      skin_type: 'peau-grasse',
      skin_zone: 'visage',
      product_type: 'serum',
      concern: 'acne',
      skin_effect: 'matifiant',
      product_characteristic: 'vegan,non-comedogene',
      routine_step: 'matin',
      ingredient: 'niacinamide',
      avoid_for: 'peau-sensible',
    })
  })

  it('serializes haircare tag filter keys', () => {
    const q = buildListProductsQuery({
      category: 'haircare',
      hair_type: ['cheveux-boucles'],
      hair_effect: ['hydratant'],
    })
    expect(q).toEqual({
      category: 'haircare',
      hair_type: 'cheveux-boucles',
      hair_effect: 'hydratant',
    })
  })

  it('serializes dental tag filter keys', () => {
    const q = buildListProductsQuery({
      category: 'dental',
      age_group: ['adulte'],
      dental_effect: ['blanchissant'],
    })
    expect(q).toEqual({
      category: 'dental',
      age_group: 'adulte',
      dental_effect: 'blanchissant',
    })
  })

  it('serializes supplement tag filter keys', () => {
    const q = buildListProductsQuery({
      category: 'complement',
      goal: ['immunite'],
      moment: ['matin'],
      restriction: ['vegan'],
    })
    expect(q).toEqual({
      category: 'complement',
      goal: 'immunite',
      moment: 'matin',
      restriction: 'vegan',
    })
  })
})

describe('buildListProductsQuery — sort', () => {
  it('includes sort when set', () => {
    expect(buildListProductsQuery({ sort: 'price_asc' })).toEqual({ sort: 'price_asc' })
  })

  it('omits sort when undefined', () => {
    expect(buildListProductsQuery({}).sort).toBeUndefined()
  })
})

describe('buildListProductsQuery — price range', () => {
  it('stringifies priceMin', () => {
    expect(buildListProductsQuery({ priceMin: 1500 })).toEqual({ priceMin: '1500' })
  })

  it('stringifies priceMax', () => {
    expect(buildListProductsQuery({ priceMax: 5000 })).toEqual({ priceMax: '5000' })
  })

  it('includes both bounds independently', () => {
    expect(buildListProductsQuery({ priceMin: 1000, priceMax: 5000 })).toEqual({
      priceMin: '1000',
      priceMax: '5000',
    })
  })

  it('keeps priceMin=0 (not omitted)', () => {
    expect(buildListProductsQuery({ priceMin: 0 })).toEqual({ priceMin: '0' })
  })
})

describe('buildListProductsQuery — pagination', () => {
  it('stringifies page and limit', () => {
    expect(buildListProductsQuery({ page: 3, limit: 20 })).toEqual({
      page: '3',
      limit: '20',
    })
  })

  it('omits page/limit when undefined', () => {
    const q = buildListProductsQuery({ brand: 'X' })
    expect(q.page).toBeUndefined()
    expect(q.limit).toBeUndefined()
  })
})

describe('buildListProductsQuery — adversarial / edge-case inputs', () => {
  // Empty string is falsy and filtered; [''] is truthy and leaks through.
  it('single empty string is filtered out', () => {
    expect(buildListProductsQuery({ brand: '' })).toEqual({})
  })

  it('array containing a single empty string leaks into output (caller must sanitize)', () => {
    const q = buildListProductsQuery({ brand: [''] })
    expect(q.brand).toBe('')
  })

  it('mixed valid + empty string produces a trailing comma in CSV', () => {
    const q = buildListProductsQuery({ brand: ['CeraVe', ''] })
    expect(q.brand).toBe('CeraVe,')
  })

  it('value with an embedded comma passes through unchanged (CSV ambiguity)', () => {
    // Backend will read 'La,Roche' as two slugs.
    const q = buildListProductsQuery({ brand: ['La,Roche'] })
    expect(q.brand).toBe('La,Roche')
  })

  it('NaN page is stringified as "NaN" (caller must validate)', () => {
    const q = buildListProductsQuery({ page: NaN })
    expect(q.page).toBe('NaN')
  })

  it('negative page is stringified and forwarded', () => {
    expect(buildListProductsQuery({ page: -1 })).toEqual({ page: '-1' })
  })

  it('Infinity priceMax is stringified as "Infinity"', () => {
    const q = buildListProductsQuery({ priceMax: Infinity })
    expect(q.priceMax).toBe('Infinity')
  })

  it('negative priceMin is stringified and forwarded', () => {
    expect(buildListProductsQuery({ priceMin: -500 })).toEqual({ priceMin: '-500' })
  })

  it('inverted price range is forwarded without throwing', () => {
    expect(() => buildListProductsQuery({ priceMin: 9999, priceMax: 100 })).not.toThrow()
  })

  it('joins a very large array without throwing', () => {
    const slugs = Array.from({ length: 500 }, (_, i) => `slug-${i}`)
    expect(() => buildListProductsQuery({ concern: slugs })).not.toThrow()
    const q = buildListProductsQuery({ concern: slugs })
    expect(q.concern).toContain('slug-0')
    expect(q.concern).toContain('slug-499')
  })

  it('forwards duplicate slugs without deduplication', () => {
    const q = buildListProductsQuery({ concern: ['acne', 'acne'] })
    expect(q.concern).toBe('acne,acne')
  })

  it('serializes multiple avoid_for slugs as CSV', () => {
    const q = buildListProductsQuery({ avoid_for: ['peau-sensible', 'comedogene'] })
    expect(q.avoid_for).toBe('peau-sensible,comedogene')
  })

  it('ignores extra properties not handled by addParam', () => {
    const filters = { brand: 'CeraVe', unknown_key: 'value' } as Parameters<
      typeof buildListProductsQuery
    >[0]
    const q = buildListProductsQuery(filters)
    expect(q.brand).toBe('CeraVe')
    expect(q.unknown_key).toBeUndefined()
  })
})

describe('buildListProductsQuery — category and kind', () => {
  it('serializes a domain tab category', () => {
    const q = buildListProductsQuery({ category: 'haircare' })
    expect(q.category).toBe('haircare')
  })

  it('omits category when undefined', () => {
    const q = buildListProductsQuery({})
    expect(q.category).toBeUndefined()
  })

  // `kind` was dropped from FILTER_KEYS (refactor ff5fcd08); backend still accepts ?kind= for direct API consumers.
})
