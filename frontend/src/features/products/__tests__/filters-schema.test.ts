import { describe, expect, it } from 'vitest'

import { productsSearchDefaults, productsSearchSchema } from '../filters'

describe('productsSearchSchema — defaults', () => {
  it('parses an empty object into sensible defaults', () => {
    const parsed = productsSearchSchema.parse({})
    expect(parsed.sort).toBe('newest')
    expect(parsed.profile_filter).toBe(false)
    expect(parsed.page).toBe(1)
    expect(parsed.priceMin).toBeUndefined()
    expect(parsed.priceMax).toBeUndefined()
  })

  it('default values object matches the schema output on empty input', () => {
    expect(productsSearchDefaults.profile_filter).toBe(false)
    expect(productsSearchDefaults.sort).toBe('newest')
    expect(productsSearchDefaults.page).toBe(1)
  })
})

describe('productsSearchSchema — sort', () => {
  it.each([
    'name',
    'random',
    'price_asc',
    'price_desc',
    'newest',
  ] as const)('accepts sort=%s', (sort) => {
    expect(productsSearchSchema.parse({ sort }).sort).toBe(sort)
  })

  it('rejects unknown sort values', () => {
    expect(() => productsSearchSchema.parse({ sort: 'alphabetical' })).toThrow()
  })

  it('defaults sort to relevance when q is present', () => {
    expect(productsSearchSchema.parse({ q: 'serum' }).sort).toBe('relevance')
  })

  it('keeps an explicit sort alongside q', () => {
    expect(productsSearchSchema.parse({ q: 'serum', sort: 'price_asc' }).sort).toBe('price_asc')
  })

  it('heals relevance back to newest when q is absent', () => {
    expect(productsSearchSchema.parse({ sort: 'relevance' }).sort).toBe('newest')
  })

  // TanStack round-trips validateSearch output through the URL and re-validates.
  it('is idempotent on its own output', () => {
    const first = productsSearchSchema.parse({ q: 'serum' })
    expect(productsSearchSchema.parse(first)).toEqual(first)
  })
})

// Invalid q from a shared/hand-crafted URL degrades to the plain list; a throw here
// would bubble past the route and replace the whole app shell with GlobalError.
describe('productsSearchSchema — q resilience', () => {
  it('drops a whitespace-only q instead of throwing', () => {
    const parsed = productsSearchSchema.parse({ q: '   ' })
    expect(parsed.q).toBeUndefined()
    expect(parsed.sort).toBe('newest')
  })

  it('drops a q longer than 100 chars instead of throwing', () => {
    expect(productsSearchSchema.parse({ q: 'x'.repeat(101) }).q).toBeUndefined()
  })

  it('trims and keeps a valid padded q', () => {
    const parsed = productsSearchSchema.parse({ q: '  serum  ' })
    expect(parsed.q).toBe('serum')
    expect(parsed.sort).toBe('relevance')
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

  it.each(['skincare', 'haircare', 'dental', 'complement'])('accepts category = %s', (value) => {
    const parsed = productsSearchSchema.parse({ category: value })
    expect(parsed.category).toBe(value)
  })

  it('rejects unknown category', () => {
    expect(() => productsSearchSchema.parse({ category: 'nope' })).toThrow()
  })
})
