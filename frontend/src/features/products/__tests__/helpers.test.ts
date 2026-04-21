import { describe, expect, it } from 'vitest'

import type { FilterValues } from '@/component/Filter'
import { type FilterKey, FILTER_KEYS } from '../filters'
import {
  buildDomainSwitchSearch,
  buildProductsApiFilters,
  buildResetSearchParams,
  hasActivePriceRange,
  isDiscoveryMode,
} from '../helpers'

function emptyTagFilters(): FilterValues<FilterKey> {
  return Object.fromEntries(FILTER_KEYS.map((k) => [k, []])) as unknown as FilterValues<FilterKey>
}

describe('hasActivePriceRange', () => {
  it('returns false when both bounds are undefined', () => {
    expect(hasActivePriceRange()).toBe(false)
  })

  it('returns true when priceMin alone is set', () => {
    expect(hasActivePriceRange(1000)).toBe(true)
  })

  it('returns true when priceMax alone is set', () => {
    expect(hasActivePriceRange(undefined, 5000)).toBe(true)
  })

  it('returns true when priceMin is 0 (explicit zero is still a bound)', () => {
    expect(hasActivePriceRange(0)).toBe(true)
  })
})

describe('isDiscoveryMode', () => {
  it('is true when no filters + no price range + sort=random', () => {
    expect(isDiscoveryMode({ hasFilters: false, hasPriceRange: false, sort: 'random' })).toBe(true)
  })

  it('is false when any filter is active', () => {
    expect(isDiscoveryMode({ hasFilters: true, hasPriceRange: false, sort: 'random' })).toBe(false)
  })

  it('is false when a price range is active', () => {
    expect(isDiscoveryMode({ hasFilters: false, hasPriceRange: true, sort: 'random' })).toBe(false)
  })

  it('is false when an explicit sort is set', () => {
    expect(isDiscoveryMode({ hasFilters: false, hasPriceRange: false, sort: 'name' })).toBe(false)
    expect(isDiscoveryMode({ hasFilters: false, hasPriceRange: false, sort: 'price_asc' })).toBe(
      false
    )
  })
})

describe('buildProductsApiFilters', () => {
  it('returns discovery payload (sort=random, limit=12) when in discovery mode', () => {
    const out = buildProductsApiFilters({
      filters: emptyTagFilters(),
      avoidFor: [],
      sort: 'random',
      page: 1,
      hasFilters: false,
    })
    expect(out).toEqual({ sort: 'random', limit: 12, avoid_for: undefined })
  })

  it('includes avoid_for in discovery mode when the profile has slugs', () => {
    const out = buildProductsApiFilters({
      filters: emptyTagFilters(),
      avoidFor: ['peau-reactive'],
      sort: 'random',
      page: 1,
      hasFilters: false,
    })
    expect(out.avoid_for).toEqual(['peau-reactive'])
    expect(out.limit).toBe(12)
  })

  it('switches to paginated mode (limit=20 + sort + price) when filters are active', () => {
    const filters = emptyTagFilters()
    filters.concern = ['acne']
    const out = buildProductsApiFilters({
      filters,
      avoidFor: [],
      sort: 'name',
      priceMin: 1000,
      priceMax: 5000,
      page: 2,
      hasFilters: true,
    })
    expect(out.concern).toEqual(['acne'])
    expect(out.sort).toBe('name')
    expect(out.priceMin).toBe(1000)
    expect(out.priceMax).toBe(5000)
    expect(out.page).toBe(2)
    expect(out.limit).toBe(20)
  })

  it('leaves empty tag arrays as undefined rather than sending "[]"', () => {
    const filters = emptyTagFilters()
    filters.concern = ['acne']
    // skin_type stays []
    const out = buildProductsApiFilters({
      filters,
      avoidFor: [],
      sort: 'name',
      page: 1,
      hasFilters: true,
    })
    expect(out.concern).toEqual(['acne'])
    expect(out.skin_type).toBeUndefined()
  })

  it('switches out of discovery when only sort is changed (no filters, no price)', () => {
    const out = buildProductsApiFilters({
      filters: emptyTagFilters(),
      avoidFor: [],
      sort: 'price_asc',
      page: 1,
      hasFilters: false,
    })
    expect(out.limit).toBe(20)
    expect(out.sort).toBe('price_asc')
  })

  it('switches out of discovery when only a price range is set', () => {
    const out = buildProductsApiFilters({
      filters: emptyTagFilters(),
      avoidFor: [],
      sort: 'random',
      priceMin: 500,
      page: 1,
      hasFilters: false,
    })
    expect(out.limit).toBe(20)
    expect(out.priceMin).toBe(500)
  })
})

describe('buildResetSearchParams', () => {
  it('clears profile_filter + price bounds', () => {
    const prev = { profile_filter: true, priceMin: 1500, priceMax: 5000, sort: 'name', page: 3 }
    expect(buildResetSearchParams(prev)).toEqual({
      profile_filter: false,
      priceMin: undefined,
      priceMax: undefined,
      sort: 'name',
      page: 3,
    })
  })

  it('preserves unrelated keys', () => {
    const prev = { sort: 'price_asc', page: 2, concern: ['acne'] }
    const next = buildResetSearchParams(prev)
    expect(next.sort).toBe('price_asc')
    expect(next.page).toBe(2)
    expect(next.concern).toEqual(['acne'])
  })
})

describe('buildDomainSwitchSearch', () => {
  const EMPTY_TAGS = {
    skin_type: [] as string[],
    concern: [] as string[],
    skin_zone: [] as string[],
    product_type: [] as string[],
    routine_step: [] as string[],
    skin_effect: [] as string[],
    product_label: [] as string[],
    shared_label: [] as string[],
  }

  it('switches category and resets tag filters', () => {
    const prev = {
      category: 'skincare' as const,
      skin_type: ['peau-grasse'],
      concern: ['anti-acne'],
      brand: ['Cosrx'],
      kind: ['serum'],
      ingredient: ['niacinamide'],
      priceMin: 1000,
      priceMax: 5000,
      sort: 'price_asc' as const,
      profile_filter: true,
      page: 3,
    }

    const next = buildDomainSwitchSearch(prev, 'haircare', EMPTY_TAGS)

    expect(next.category).toBe('haircare')
    expect(next.skin_type).toEqual([])
    expect(next.concern).toEqual([])
    expect(next.brand).toEqual([])
    expect(next.kind).toEqual([])
    expect(next.profile_filter).toBe(false)
    expect(next.page).toBe(1)
  })

  it('preserves sort, priceMin, priceMax, and ingredient', () => {
    const prev = {
      category: 'skincare' as const,
      sort: 'price_desc' as const,
      priceMin: 500,
      priceMax: 2000,
      ingredient: ['acide-hyaluronique'],
    }

    const next = buildDomainSwitchSearch(prev, 'dental', EMPTY_TAGS)

    expect(next.sort).toBe('price_desc')
    expect(next.priceMin).toBe(500)
    expect(next.priceMax).toBe(2000)
    expect(next.ingredient).toEqual(['acide-hyaluronique'])
  })
})
