import { describe, expect, it } from 'vitest'

import type { UserProduct } from '@/lib/queries/user-products'
import { applyFilters, type CollectionFilters, sortProducts } from './filterLogic'

// Pure-function coverage for the non-obvious branches: minNote threshold,
// maxPrice passthrough, sentiment/repurchase passthrough, and the null-last
// compatibility sort. Fixtures carry only the fields the two functions read.
const makeProduct = (over: {
  id?: string
  name?: string
  brand?: string
  kind?: string
  priceCents?: number | null
  sentiment?: number
  wouldRepurchase?: boolean
  review?: Record<string, number> | null
  updatedAt?: string
}): UserProduct =>
  ({
    id: over.id ?? 'up-1',
    sentiment: over.sentiment,
    wouldRepurchase: over.wouldRepurchase,
    review: over.review ?? null,
    updatedAt: over.updatedAt ?? '2026-01-01T00:00:00.000Z',
    product: {
      id: over.id ?? 'p-1',
      name: over.name ?? 'Serum',
      brand: over.brand ?? 'BrandA',
      kind: over.kind ?? 'serum',
      priceCents: over.priceCents ?? null,
    },
  }) as unknown as UserProduct

const baseFilters: CollectionFilters = {
  q: '',
  brand: 'all',
  productType: 'all',
  sentiment: 'all',
  repurchase: 'all',
  minNote: 0,
  maxPrice: '',
} as unknown as CollectionFilters

describe('applyFilters', () => {
  it('minNote=0 keeps un-reviewed products (score coerces to 0)', () => {
    const products = [makeProduct({ id: 'a', review: null })]
    expect(applyFilters(products, baseFilters, undefined)).toHaveLength(1)
  })

  it('minNote excludes products scoring below the threshold', () => {
    const products = [
      makeProduct({ id: 'low', review: { tolerance: 2 } }), // → 8.0/20
      makeProduct({ id: 'high', review: { tolerance: 4 } }), // → 16.0/20
    ]
    const filtered = applyFilters(products, { ...baseFilters, minNote: 10 }, undefined)
    expect(filtered.map((p) => p.id)).toEqual(['high'])
  })

  it("maxPrice='' is a passthrough; a numeric bound excludes pricier products", () => {
    const products = [
      makeProduct({ id: 'cheap', priceCents: 500 }), // 5€
      makeProduct({ id: 'pricey', priceCents: 3000 }), // 30€
    ]
    expect(applyFilters(products, baseFilters, undefined)).toHaveLength(2)
    const bounded = applyFilters(products, { ...baseFilters, maxPrice: 10 }, undefined)
    expect(bounded.map((p) => p.id)).toEqual(['cheap'])
  })

  it('treats a null price as 0 under a numeric bound', () => {
    const products = [makeProduct({ id: 'free', priceCents: null })]
    expect(applyFilters(products, { ...baseFilters, maxPrice: 1 }, undefined)).toHaveLength(1)
  })

  it("sentiment='all' passes; a specific value narrows", () => {
    const products = [
      makeProduct({ id: 's6', sentiment: 6 }),
      makeProduct({ id: 's1', sentiment: 1 }),
    ]
    expect(applyFilters(products, baseFilters, undefined)).toHaveLength(2)
    const narrowed = applyFilters(
      products,
      { ...baseFilters, sentiment: 6 } as unknown as CollectionFilters,
      undefined
    )
    expect(narrowed.map((p) => p.id)).toEqual(['s6'])
  })

  it('repurchase narrows on the boolean flag', () => {
    const products = [
      makeProduct({ id: 'yes', wouldRepurchase: true }),
      makeProduct({ id: 'no', wouldRepurchase: false }),
    ]
    const narrowed = applyFilters(
      products,
      { ...baseFilters, repurchase: true } as unknown as CollectionFilters,
      undefined
    )
    expect(narrowed.map((p) => p.id)).toEqual(['yes'])
  })

  it('search matches name or brand, case-insensitively', () => {
    const products = [
      makeProduct({ id: 'm', name: 'Vitamin C Serum', brand: 'BrandA' }),
      makeProduct({ id: 'b', name: 'Cleanser', brand: 'Vichy' }),
      makeProduct({ id: 'x', name: 'Cream', brand: 'BrandB' }),
    ]
    expect(applyFilters(products, { ...baseFilters, q: 'vi' }, undefined).map((p) => p.id)).toEqual(
      ['m', 'b']
    )
  })
})

describe('sortProducts', () => {
  it('compatibility_desc sorts scored products first, null-last', () => {
    const products = [
      makeProduct({ id: 'none' }),
      makeProduct({ id: 'low' }),
      makeProduct({ id: 'high' }),
    ]
    const scores = { high: 0.9, low: 0.2 } // 'none' absent → NEGATIVE_INFINITY
    const sorted = sortProducts(products, 'compatibility_desc', undefined, undefined, scores)
    expect(sorted.map((p) => p.id)).toEqual(['high', 'low', 'none'])
  })

  it('does not mutate the input array', () => {
    const products = [makeProduct({ id: 'a', name: 'B' }), makeProduct({ id: 'b', name: 'A' })]
    const original = products.map((p) => p.id)
    sortProducts(products, 'name', undefined, undefined)
    expect(products.map((p) => p.id)).toEqual(original)
  })

  it('sorts by name alphabetically', () => {
    const products = [
      makeProduct({ id: 'b', name: 'Zinc' }),
      makeProduct({ id: 'a', name: 'Aloe' }),
    ]
    expect(sortProducts(products, 'name', undefined, undefined).map((p) => p.id)).toEqual([
      'a',
      'b',
    ])
  })
})
