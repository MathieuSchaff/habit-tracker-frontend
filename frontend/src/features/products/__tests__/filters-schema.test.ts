import { describe, expect, it } from 'vitest'

import { productsSearchDefaults, productsSearchSchema } from '../filters'

describe('productsSearchSchema — defaults', () => {
  it('parses an empty object into sensible defaults', () => {
    const parsed = productsSearchSchema.parse({})
    expect(parsed.sort).toBe('random')
    expect(parsed.profile_filter).toBe(false)
    expect(parsed.page).toBe(1)
    expect(parsed.priceMin).toBeUndefined()
    expect(parsed.priceMax).toBeUndefined()
  })

  it('default values object matches the schema output on empty input', () => {
    expect(productsSearchDefaults.profile_filter).toBe(false)
    expect(productsSearchDefaults.sort).toBe('random')
    expect(productsSearchDefaults.page).toBe(1)
  })
})

describe('productsSearchSchema — sort', () => {
  it.each(['name', 'random', 'price_asc', 'price_desc', 'newest'] as const)(
    'accepts sort=%s',
    (sort) => {
      expect(productsSearchSchema.parse({ sort }).sort).toBe(sort)
    }
  )

  it('falls back to default for unknown sort values', () => {
    expect(productsSearchSchema.parse({ sort: 'alphabetical' }).sort).toBe('random')
  })
})

describe('productsSearchSchema — priceMin / priceMax', () => {
  it('accepts a positive integer priceMin', () => {
    expect(productsSearchSchema.parse({ priceMin: 1500 }).priceMin).toBe(1500)
  })

  it('accepts 0 as a valid bound', () => {
    expect(productsSearchSchema.parse({ priceMin: 0, priceMax: 0 }).priceMin).toBe(0)
  })

  it('rejects negative priceMin', () => {
    expect(() => productsSearchSchema.parse({ priceMin: -1 })).toThrow()
  })

  it('rejects non-integer prices', () => {
    expect(() => productsSearchSchema.parse({ priceMin: 12.5 })).toThrow()
  })

  it('leaves both undefined when omitted', () => {
    const parsed = productsSearchSchema.parse({})
    expect(parsed.priceMin).toBeUndefined()
    expect(parsed.priceMax).toBeUndefined()
  })
})

describe('productsSearchSchema — tag filters', () => {
  it('accepts an array of slugs for a tag category', () => {
    const parsed = productsSearchSchema.parse({ concern: ['acne', 'anti-age'] })
    expect(parsed.concern).toEqual(['acne', 'anti-age'])
  })

  it('defaults unspecified tag arrays to empty', () => {
    const parsed = productsSearchSchema.parse({})
    expect(parsed.concern).toEqual([])
    expect(parsed.skin_type).toEqual([])
  })
})

describe('productsSearchSchema — profile_filter', () => {
  it('defaults to false', () => {
    expect(productsSearchSchema.parse({}).profile_filter).toBe(false)
  })

  it('accepts true', () => {
    expect(productsSearchSchema.parse({ profile_filter: true }).profile_filter).toBe(true)
  })
})

describe('productsSearchSchema — category', () => {
  it('defaults category to skincare', () => {
    const parsed = productsSearchSchema.parse({})
    expect(parsed.category).toBe('skincare')
  })

  it.each(['skincare', 'haircare', 'dental', 'complement'])(
    'accepts category = %s',
    (value) => {
      const parsed = productsSearchSchema.parse({ category: value })
      expect(parsed.category).toBe(value)
    }
  )

  it('falls back to skincare for unknown category', () => {
    expect(productsSearchSchema.parse({ category: 'nope' }).category).toBe('skincare')
  })
})

describe('productsSearchSchema — kind', () => {
  it('defaults kind to an empty array', () => {
    const parsed = productsSearchSchema.parse({})
    expect(parsed.kind).toEqual([])
  })
})
