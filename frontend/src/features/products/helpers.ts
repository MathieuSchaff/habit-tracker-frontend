import { DOMAIN_PRODUCT_FILTER_CATEGORIES, type ProductDomainTab } from '@aurore/shared'

import type { FilterValues } from '@/component/Filter'
import type { ListProductsFilters, ProductSort } from '@/lib/queries/products'
import { FILTER_KEYS, type FilterKey, type ProductsSearch, type TagFilterKey } from './filters'

export function hasActivePriceRange(priceMin?: number, priceMax?: number): boolean {
  return priceMin !== undefined || priceMax !== undefined
}

// Single source of truth for avoidFor (skin types + concerns to down-rank), shared by
// ProductsPage and the /products loader so the prefetched list queryKey matches the
// component's first render even when dermo is already cached and profile_filter is on.
type DermoLike = { skinTypes?: readonly string[] | null; skinConcerns: readonly string[] }
export function deriveAvoidFor(
  dermo: DermoLike | undefined | null,
  profileFilter?: boolean
): string[] {
  if (!profileFilter || !dermo) return []
  return [...(dermo.skinTypes ?? []), ...dermo.skinConcerns]
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

// Single source of truth for the list query input: both the /products loader (prefetch)
// and ProductsPage call this so the queryKey matches and the prefetch lands.
export function productsListApiFilters(
  search: ProductsSearch,
  avoidFor: string[]
): ListProductsFilters {
  const filters = Object.fromEntries(
    FILTER_KEYS.map((k) => [k, search[k] ?? []])
  ) as FilterValues<FilterKey>
  const hasFilters = FILTER_KEYS.some((k) => (search[k]?.length ?? 0) > 0)
  return buildProductsApiFilters({
    category: search.category,
    filters,
    avoidFor,
    sort: search.sort,
    priceMin: search.priceMin,
    priceMax: search.priceMax,
    q: search.q,
    page: search.page,
    hasFilters,
  })
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
