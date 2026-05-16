import { DOMAIN_PRODUCT_FILTER_CATEGORIES, type ProductDomainTab } from '@habit-tracker/shared'

import type { FilterValues } from '@/component/Filter'
import type { ListProductsFilters, ProductSort } from '@/lib/queries/products'
import type { FilterKey, TagFilterKey } from './filters'

export function hasActivePriceRange(priceMin?: number, priceMax?: number): boolean {
  return priceMin !== undefined || priceMax !== undefined
}

// Discovery mode = untouched listing. Any filter/price/query/sort exits it.
export function isDiscoveryMode(args: {
  hasFilters: boolean
  hasPriceRange: boolean
  hasQuery: boolean
  sort: ProductSort
}): boolean {
  return !args.hasFilters && !args.hasPriceRange && !args.hasQuery && args.sort === 'newest'
}

export function buildProductsApiFilters(args: {
  category: ProductDomainTab
  filters: FilterValues<FilterKey>
  avoidFor: string[]
  sort: ProductSort
  priceMin?: number
  priceMax?: number
  q?: string
  page: number
  hasFilters: boolean
}): ListProductsFilters {
  const hasPriceRange = hasActivePriceRange(args.priceMin, args.priceMax)
  const hasQuery = !!args.q
  const avoidFor = args.avoidFor.length > 0 ? args.avoidFor : undefined

  if (isDiscoveryMode({ hasFilters: args.hasFilters, hasPriceRange, hasQuery, sort: args.sort })) {
    return {
      category: args.category,
      sort: 'newest',
      limit: 20,
      page: args.page,
      avoid_for: avoidFor,
    }
  }

  const domainKeys = DOMAIN_PRODUCT_FILTER_CATEGORIES[args.category]
  const tagFields = Object.fromEntries(
    domainKeys.map((k) => {
      const val = args.filters[k as TagFilterKey]
      return [k, val?.length > 0 ? val : undefined]
    })
  ) as Partial<ListProductsFilters>

  const brand = args.filters.brand
  const ingredient = args.filters.ingredient

  return {
    category: args.category,
    ...tagFields,
    brand: brand && brand.length > 0 ? brand : undefined,
    ingredient: ingredient && ingredient.length > 0 ? ingredient : undefined,
    q: args.q,
    avoid_for: avoidFor,
    sort: args.sort,
    priceMin: args.priceMin,
    priceMax: args.priceMax,
    page: args.page,
    limit: 20,
  }
}

// UI-level toggles outside FilterDrawer state. Tag filters reset via useListFilters.resetFilters().
export function buildResetSearchParams<T extends Record<string, unknown>>(prev: T) {
  return {
    ...prev,
    profile_filter: false,
    priceMin: undefined,
    priceMax: undefined,
    q: undefined,
  }
}

// brand and ingredient carry over across domains; tag filters and pagination reset.
export function buildDomainSwitchSearch<T extends Record<string, unknown>>(
  prev: T,
  next: ProductDomainTab,
  emptyTagFilters: Record<string, string[]>
) {
  return {
    ...prev,
    ...emptyTagFilters,
    category: next,
    profile_filter: false,
    q: undefined,
    page: 1,
  }
}
