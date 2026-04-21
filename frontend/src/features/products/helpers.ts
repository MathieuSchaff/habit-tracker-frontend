import type { ProductDomainTab } from '@habit-tracker/shared'

import type { FilterValues } from '@/component/Filter'
import type { ListProductsFilters, ProductSort } from '@/lib/queries/products'
import { FILTER_KEYS, type FilterKey } from './filters'

export function hasActivePriceRange(priceMin?: number, priceMax?: number): boolean {
  return priceMin !== undefined || priceMax !== undefined
}

// Discovery mode = untouched listing page. Any user intent (a filter, a price
// range, or an explicit sort choice) bumps the user out of it.
export function isDiscoveryMode(args: {
  hasFilters: boolean
  hasPriceRange: boolean
  sort: ProductSort
}): boolean {
  return !args.hasFilters && !args.hasPriceRange && args.sort === 'random'
}

export function buildProductsApiFilters(args: {
  filters: FilterValues<FilterKey>
  avoidFor: string[]
  sort: ProductSort
  priceMin?: number
  priceMax?: number
  page: number
  hasFilters: boolean
}): ListProductsFilters {
  const hasPriceRange = hasActivePriceRange(args.priceMin, args.priceMax)
  const avoidFor = args.avoidFor.length > 0 ? args.avoidFor : undefined

  if (isDiscoveryMode({ hasFilters: args.hasFilters, hasPriceRange, sort: args.sort })) {
    return { sort: 'random', limit: 12, avoid_for: avoidFor }
  }

  const tagFields = Object.fromEntries(
    FILTER_KEYS.map((k) => [k, args.filters[k].length > 0 ? args.filters[k] : undefined])
  ) as Partial<ListProductsFilters>

  return {
    ...tagFields,
    avoid_for: avoidFor,
    sort: args.sort,
    priceMin: args.priceMin,
    priceMax: args.priceMax,
    page: args.page,
    limit: 20,
  }
}

// Reset of UI-level toggles that live outside the FilterDrawer local state.
// Tag filters are reset separately via `useListFilters.resetFilters()`.
export function buildResetSearchParams<T extends Record<string, unknown>>(prev: T) {
  return {
    ...prev,
    profile_filter: false,
    priceMin: undefined,
    priceMax: undefined,
  }
}

// On domain switch: reset the domain-specific filters and pagination.
// Shared controls (sort, price, ingredient) carry over because they make
// sense across all tabs.
export function buildDomainSwitchSearch<T extends Record<string, unknown>>(
  prev: T,
  next: ProductDomainTab,
  emptyTagFilters: Record<string, string[]>
) {
  return {
    ...prev,
    ...emptyTagFilters,
    category: next,
    brand: [] as string[],
    kind: [] as string[],
    profile_filter: false,
    page: 1,
  }
}
