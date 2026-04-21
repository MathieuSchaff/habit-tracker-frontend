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

  it('serializes all 11 array-style filter keys', () => {
    const q = buildListProductsQuery({
      brand: ['A'],
      skin_type: ['peau-grasse'],
      skin_zone: ['visage'],
      product_type: ['serum'],
      concern: ['acne'],
      skin_effect: ['matifiant'],
      product_label: ['vegan'],
      shared_label: ['non-comedogene'],
      routine_step: ['matin'],
      ingredient: ['niacinamide'],
      avoid_for: ['peau-reactive'],
    })
    expect(q).toEqual({
      brand: 'A',
      skin_type: 'peau-grasse',
      skin_zone: 'visage',
      product_type: 'serum',
      concern: 'acne',
      skin_effect: 'matifiant',
      product_label: 'vegan',
      shared_label: 'non-comedogene',
      routine_step: 'matin',
      ingredient: 'niacinamide',
      avoid_for: 'peau-reactive',
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

describe('buildListProductsQuery — category and kind', () => {
  it('serializes a domain tab category', () => {
    const q = buildListProductsQuery({ category: 'haircare' })
    expect(q.category).toBe('haircare')
  })

  it('omits category when undefined', () => {
    const q = buildListProductsQuery({})
    expect(q.category).toBeUndefined()
  })

  it('serializes a single kind value', () => {
    const q = buildListProductsQuery({ kind: 'toothpaste' })
    expect(q.kind).toBe('toothpaste')
  })

  it('serializes multiple kind values as CSV', () => {
    const q = buildListProductsQuery({ kind: ['toothpaste', 'mouthwash'] })
    expect(q.kind).toBe('toothpaste,mouthwash')
  })

  it('omits kind when array is empty', () => {
    const q = buildListProductsQuery({ kind: [] })
    expect(q.kind).toBeUndefined()
  })
})
